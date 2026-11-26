from contextlib import contextmanager
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from enum import Enum
from uuid import UUID
from typing import Any, Annotated, Literal
from fastapi import Request, Depends, Query, Path
from pydantic import BaseModel, ConfigDict, Field
from psycopg import sql
from psycopg.rows import tuple_row
from app.core.exceptions import ValidationError, PermissionDeniedError, NotFoundError
from app.core.validators import validate_identifier
from app.modules.history.domain.entities import OperationContext, OperationType

ServerId = Annotated[int, Path(ge=1)]
ObjectId = Annotated[int, Path(ge=1)]
Limit = Annotated[int, Query(ge=1, le=1000)]
Offset = Annotated[int, Query(ge=0)]
Name = Annotated[str, Field(min_length=1, max_length=63)]

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', populate_by_name=True)

class Confirmed(Input):
    confirmed: Literal[True]

def features(request: Request):
    return request.app.state.container.features

def ident(*parts):
    for part in parts:
        validate_identifier(part)
    return sql.Identifier(*parts)

def json_value(value):
    if isinstance(value, dict):
        return {str(k): json_value(v) for k,v in value.items()}
    if isinstance(value, (tuple,list)):
        return [json_value(v) for v in value]
    if isinstance(value, (datetime,date,time)):
        return value.isoformat()
    if isinstance(value, (Decimal, UUID, timedelta)):
        return str(value)
    if isinstance(value, (bytes,bytearray,memoryview)):
        return bytes(value).hex()
    if isinstance(value, float) and not __import__('math').isfinite(value):
        return str(value)
    if value is None or isinstance(value,(str,int,float,bool)):
        return value
    return str(value)

def rows(conn, query, params=None):
    return json_value(conn.execute(query, params).fetchall())

def one(conn, query, params=None):
    row = conn.execute(query, params).fetchone()
    return json_value(row)

class Access:
    def __init__(self, profiles, connections, factory, history, settings, sqlite):
        self.profiles = profiles
        self.connections = connections
        self.factory = factory
        self.history = history
        self.settings = settings
        self.sqlite = sqlite

    def credentials(self, server_id, database=None, readonly=False):
        return self.connections.get_credentials(server_id, database, readonly)

    @contextmanager
    def connection(self, server_id, database=None, *, readonly=False, autocommit=False, limited=True):
        creds = self.credentials(server_id, database, readonly)
        with self.factory.connection(creds, autocommit=autocommit, readonly=readonly, limited=limited) as conn:
            if readonly:
                role = conn.execute("""SELECT rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls AS elevated
                   FROM pg_roles WHERE rolname=current_user""").fetchone()
                if not role or role['elevated']:
                    raise PermissionDeniedError('La cuenta de lectura tiene atributos elevados')
            yield conn

    def context(self, server_id, database, operation, target=None, readonly=False):
        profile = self.profiles.get_server(server_id)
        return OperationContext(operation_type=OperationType(operation), executed_by=(profile.reader_username or profile.username) if readonly else profile.username,
            server_id=server_id, server_name=profile.name, database_name=database or profile.database_name, target_object=target)

    @contextmanager
    def audit(self, server_id, database, operation, target=None, readonly=False):
        op = self.history.begin(self.context(server_id,database,operation,target,readonly))
        metadata = {}
        try:
            yield metadata
        except Exception as exc:
            self.history.fail(op,exc)
            raise
        else:
            self.history.succeed(op,json_value(metadata))

    def protected_membership(self, conn, member, role):
        return conn.execute("""WITH RECURSIVE memberships(oid) AS (
            SELECT oid FROM pg_roles WHERE rolname=%s UNION
            SELECT a.roleid FROM pg_auth_members a JOIN memberships m ON a.member=m.oid
        ) SELECT EXISTS(SELECT 1 FROM memberships m JOIN pg_roles r ON r.oid=m.oid WHERE r.rolname=%s) AS member""",(member,role)).fetchone()['member']

    def protect_role(self, server_id, role):
        validate_identifier(role)
        profile = self.profiles.get_server(server_id)
        if role.lower().startswith('pg_') or role.lower() in {'postgres','adminlab','dbadmin_reader'} or role in {profile.username,profile.reader_username}:
            raise PermissionDeniedError('Cuenta interna o protegida')

    def page_query(self, conn, query, params=None, limit=1000, offset=0):
        limit = min(limit,self.settings.MAX_QUERY_ROWS)
        with conn.cursor(row_factory=tuple_row) as cur:
            cur.execute(query,params)
            columns = [d.name for d in cur.description]
            data = cur.fetchmany(limit+1)
        return {'columns':columns,'rows':json_value(data[:limit]),'rowCount':min(len(data),limit),'limit':limit,'offset':offset,'hasMore':len(data)>limit}
