from psycopg import sql
from psycopg.rows import tuple_row
from app.modules._shared.common import ident, rows, json_value
from app.modules.explorer.infrastructure.readonly_validator import validate_select, SENSITIVE_RELATIONS
from app.core.exceptions import NotFoundError, ReadOnlyViolationError

class PostgresExplorerGateway:
    def __init__(self, access): self.access=access

    def catalog(self,server_id,database,kind,schema=None):
        with self.access.connection(server_id,database,readonly=True) as c:
            if kind=='schemas':
                return rows(c,"""SELECT nspname AS name, pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%' ORDER BY 1""")
            if kind=='catalogs':
                return rows(c,"""SELECT n.nspname AS schema,c.relname AS name,c.relkind AS kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('pg_catalog','information_schema') AND c.relkind IN ('r','v','m','p','f') ORDER BY 1,2""")
            kinds={'tables':['r','p','f'],'views':['v','m'],'sequences':['S']}[kind]
            return rows(c,"""SELECT n.nspname AS schema,c.relname AS name,c.relkind AS kind,pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind::text=ANY(%s) AND (%s::text IS NULL OR n.nspname=%s) AND n.nspname NOT LIKE 'pg_temp_%%' AND n.nspname NOT LIKE 'pg_toast%%' ORDER BY 1,2""",(kinds,schema,schema))

    def columns(self,server_id,database,schema,object_name):
        with self.access.connection(server_id,database,readonly=True) as c:
            result=rows(c,"""SELECT a.attnum AS position,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,NOT a.attnotnull AS nullable,pg_get_expr(d.adbin,d.adrelid) AS default FROM pg_attribute a JOIN pg_class t ON t.oid=a.attrelid JOIN pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum WHERE n.nspname=%s AND t.relname=%s AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum""",(schema,object_name))
            if not result and not c.execute('SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=%s AND t.relname=%s',(schema,object_name)).fetchone():
                raise NotFoundError('Objeto no encontrado')
            return result

    def data(self,server_id,database,schema,object_name,limit,offset):
        if object_name.lower() in SENSITIVE_RELATIONS:
            raise ReadOnlyViolationError()
        limit=min(limit,self.access.settings.MAX_QUERY_ROWS)
        with self.access.connection(server_id,database,readonly=True) as c:
            q=sql.SQL('SELECT * FROM {} LIMIT %s OFFSET %s').format(ident(schema,object_name))
            return self.access.page_query(c,q,(limit+1,offset),limit,offset)

    def query(self,server_id,database,statement,limit):
        normalized=validate_select(statement)
        limit=min(limit,self.access.settings.MAX_QUERY_ROWS)
        with self.access.connection(server_id,database,readonly=True) as c:
            c.execute('SET LOCAL search_path TO pg_catalog, medistock, public')
            with c.cursor(name='dbadmin_read',row_factory=tuple_row) as cur:
                cur.execute(normalized)
                data=cur.fetchmany(limit+1)
                columns=[d.name for d in cur.description]
                return {'columns':columns,'rows':json_value(data[:limit]),'rowCount':min(len(data),limit),'limit':limit,'hasMore':len(data)>limit}
