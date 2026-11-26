from psycopg import sql
from app.core.exceptions import ValidationError,NotFoundError,PermissionDeniedError
from app.modules._shared.common import ident,rows,one
INVENTORY_COLUMNS=('id_sucursal','id_medicamento','existencia','punto_reorden','actualizado_en')
class PostgresDistributedGateway:
    def __init__(self,access):self.access=access
    def _remote(self,s,remote_id):
        if remote_id==s:raise ValidationError('El nodo remoto debe ser diferente')
        profile=self.access.profiles.get_server(remote_id)
        # Same Docker host: use service DNS on the Compose network, never a transient container IP.
        local=self.access.profiles.get_server(s)
        if profile.host!=local.host or profile.port not in (5451,5452) or profile.port==local.port:
            raise ValidationError('FDW está limitado a los dos nodos del laboratorio Docker')
        return profile, 'nodo_norte' if profile.port==5451 else 'nodo_sur'
    def extension(self,s,db):
        with self.access.connection(s,db) as c:
            c.execute('CREATE EXTENSION IF NOT EXISTS postgres_fdw')
            return one(c,"SELECT extname AS name,extversion AS version FROM pg_extension WHERE extname='postgres_fdw'")
    def servers(self,s,db):
        with self.access.connection(s,db) as c:
            return rows(c,"""SELECT s.srvname AS name,pg_get_userbyid(s.srvowner) AS owner,w.fdwname AS wrapper,(SELECT option_value FROM pg_options_to_table(s.srvoptions) WHERE option_name='host') AS host,(SELECT option_value FROM pg_options_to_table(s.srvoptions) WHERE option_name='port') AS port,(SELECT option_value FROM pg_options_to_table(s.srvoptions) WHERE option_name='dbname') AS database FROM pg_foreign_server s JOIN pg_foreign_data_wrapper w ON w.oid=s.srvfdw WHERE w.fdwname='postgres_fdw' ORDER BY 1""")
    def create_server(self,s,db,b):
        profile,host=self._remote(s,b.remote_server_id)
        with self.access.connection(s,db) as c:
            c.execute(sql.SQL('CREATE SERVER {} FOREIGN DATA WRAPPER postgres_fdw OPTIONS (host {}, port {}, dbname {}, connect_timeout {})').format(ident(b.name),sql.Literal(host),sql.Literal('5432'),sql.Literal(profile.database_name),sql.Literal('5')))
        return {'name':b.name,'host':host,'port':5432,'database':profile.database_name,'remoteServerId':b.remote_server_id}
    def mappings(self,s,db):
        with self.access.connection(s,db) as c:
            return rows(c,"""SELECT srvname AS server,COALESCE(usename,'PUBLIC') AS "localRole",(SELECT option_value FROM pg_options_to_table(umoptions) WHERE option_name='user') AS "remoteUser" FROM pg_user_mappings ORDER BY 1,2""")
    def mapping(self,s,db,b):
        remote,host=self._remote(s,b.remote_server_id)
        creds=self.access.credentials(remote.id,readonly=True)
        # Verify remote reader credentials and restricted role before storing a mapping.
        with self.access.connection(remote.id,readonly=True) as remote_c:
            remote_c.execute('SELECT 1')
        local=self.access.profiles.get_server(s)
        local_role=b.local_role or local.username
        if local_role not in {local.username,local.reader_username}:raise PermissionDeniedError('Utiliza el administrador o lector registrado del nodo local')
        with self.access.connection(s,db) as c:
            server=c.execute("""SELECT (SELECT option_value FROM pg_options_to_table(s.srvoptions) WHERE option_name='host') AS host,(SELECT option_value FROM pg_options_to_table(s.srvoptions) WHERE option_name='port') AS port,(SELECT option_value FROM pg_options_to_table(s.srvoptions) WHERE option_name='dbname') AS db FROM pg_foreign_server s JOIN pg_foreign_data_wrapper w ON w.oid=s.srvfdw WHERE s.srvname=%s AND w.fdwname='postgres_fdw'""",(b.server,)).fetchone()
            if not server:raise NotFoundError('Servidor FDW no encontrado')
            if server['host']!=host or server['port']!='5432' or server['db']!=remote.database_name:raise ValidationError('El servidor FDW no coincide con el perfil remoto')
            c.execute(sql.SQL('CREATE USER MAPPING FOR {} SERVER {} OPTIONS (user {}, password {})').format(ident(local_role),ident(b.server),sql.Literal(creds.username),sql.Literal(creds.password)))
            if local_role==local.reader_username:c.execute(sql.SQL('GRANT USAGE ON FOREIGN SERVER {} TO {}').format(ident(b.server),ident(local_role)))
        return {'server':b.server,'localRole':local_role,'remoteUser':creds.username}
    def foreign_tables(self,s,db):
        with self.access.connection(s,db) as c:
            return rows(c,"""SELECT n.nspname AS schema,t.relname AS name,s.srvname AS server,(SELECT option_value FROM pg_options_to_table(f.ftoptions) WHERE option_name='schema_name') AS "remoteSchema",(SELECT option_value FROM pg_options_to_table(f.ftoptions) WHERE option_name='table_name') AS "remoteTable" FROM pg_foreign_table f JOIN pg_class t ON t.oid=f.ftrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_foreign_server s ON s.oid=f.ftserver ORDER BY 1,2""")
    def foreign_table(self,s,db,b):
        if b.local_schema.startswith('pg_') or b.local_schema=='information_schema':raise ValidationError('Esquema protegido')
        with self.access.connection(s,db) as c:
            if not c.execute('SELECT 1 FROM pg_namespace WHERE nspname=%s',(b.local_schema,)).fetchone():raise NotFoundError('Esquema local no encontrado')
            # IMPORT FOREIGN SCHEMA keeps the exact remote column definitions. If source name
            # conflicts with an existing local table, import into a unique temporary schema,
            # move only the foreign table and remove the now-empty schema, all in one transaction.
            from uuid import uuid4
            staging='dbadmin_fdw_'+uuid4().hex[:16]
            c.execute(sql.SQL('CREATE SCHEMA {}').format(ident(staging)))
            c.execute(sql.SQL('IMPORT FOREIGN SCHEMA {} LIMIT TO ({}) FROM SERVER {} INTO {}').format(ident(b.remote_schema),ident(b.remote_table),ident(b.server),ident(staging)))
            if b.remote_table!=b.local_table:c.execute(sql.SQL('ALTER FOREIGN TABLE {} RENAME TO {}').format(ident(staging,b.remote_table),ident(b.local_table)))
            c.execute(sql.SQL('ALTER FOREIGN TABLE {} SET SCHEMA {}').format(ident(staging,b.local_table),ident(b.local_schema)))
            c.execute(sql.SQL('DROP SCHEMA {}').format(ident(staging)))
        return {'schema':b.local_schema,'table':b.local_table,'server':b.server,'remoteSchema':b.remote_schema,'remoteTable':b.remote_table}
    def test(self,s,db,b):
        with self.access.connection(s,db) as c:
            if not c.execute("SELECT 1 FROM pg_foreign_table f JOIN pg_class t ON t.oid=f.ftrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=%s AND t.relname=%s",(b.schema_name,b.table)).fetchone():raise NotFoundError('Tabla externa no encontrada')
            count=c.execute(sql.SQL('SELECT count(*) AS n FROM {}').format(ident(b.schema_name,b.table))).fetchone()['n']
        return {'reachable':True,'schema':b.schema_name,'table':b.table,'rowCount':count}
    def view(self,s,db,b):
        if b.schema_name.startswith('pg_') or b.schema_name=='information_schema':raise ValidationError('Esquema protegido')
        cols=sql.SQL(', ').join(ident(x) for x in INVENTORY_COLUMNS)
        profile=self.access.profiles.get_server(s)
        with self.access.connection(s,db) as c:
            if not c.execute("SELECT 1 FROM pg_foreign_table f JOIN pg_class t ON t.oid=f.ftrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=%s AND t.relname=%s",(b.remote_schema,b.remote_table)).fetchone():raise NotFoundError('Tabla externa no encontrada')
            c.execute(sql.SQL('CREATE VIEW {} AS SELECT {} FROM {} UNION ALL SELECT {} FROM {}').format(ident(b.schema_name,b.name),cols,ident(b.local_schema,b.local_table),cols,ident(b.remote_schema,b.remote_table)))
            if profile.reader_username:
                c.execute(sql.SQL('GRANT SELECT ON {} TO {}').format(ident(b.schema_name,b.name),ident(profile.reader_username)))
            count=c.execute(sql.SQL('SELECT count(*) AS n FROM {}').format(ident(b.schema_name,b.name))).fetchone()['n']
            breakdown=rows(c,sql.SQL('SELECT id_sucursal,count(*) AS records FROM {} GROUP BY id_sucursal ORDER BY id_sucursal').format(ident(b.schema_name,b.name)))
        return {'schema':b.schema_name,'view':b.name,'rowCount':count,'byBranch':breakdown}
    def inventory(self,s,db,schema,view,limit,offset,details):
        limit=min(limit,self.access.settings.MAX_QUERY_ROWS)
        with self.access.connection(s,db,readonly=True) as c:
            if details:
                q=sql.SQL('SELECT i.id_sucursal,i.id_medicamento,m.nombre,m.categoria,m.precio,i.existencia,i.punto_reorden,i.actualizado_en FROM {} i JOIN {} m ON m.id_medicamento=i.id_medicamento ORDER BY i.id_sucursal,i.id_medicamento LIMIT %s OFFSET %s').format(ident(schema,view),ident('medistock','medicamentos'))
            else:
                q=sql.SQL('SELECT * FROM {} ORDER BY id_sucursal,id_medicamento LIMIT %s OFFSET %s').format(ident(schema,view))
            result=self.access.page_query(c,q,(limit+1,offset),limit,offset)
            result['total']=c.execute(sql.SQL('SELECT count(*) AS n FROM {}').format(ident(schema,view))).fetchone()['n'] if not details else c.execute(sql.SQL('SELECT count(*) AS n FROM {} i JOIN {} m ON m.id_medicamento=i.id_medicamento').format(ident(schema,view),ident('medistock','medicamentos'))).fetchone()['n']
        return result
