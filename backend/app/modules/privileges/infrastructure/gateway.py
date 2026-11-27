from psycopg import sql
from app.core.exceptions import ValidationError,NotFoundError,PermissionDeniedError
from app.modules._shared.common import ident,rows
PERMS={'DATABASE':['CONNECT'],'SCHEMA':['USAGE'],'TABLE':['SELECT','INSERT','UPDATE','DELETE'],'SEQUENCE':['USAGE']}
class PostgresPrivilegeGateway:
    def __init__(self,access):self.access=access
    def _object(self,c,db,kind,schema,obj):
        if kind not in PERMS:raise ValidationError('Tipo de objeto no válido')
        if kind=='DATABASE':
            if schema or (obj and obj!=db):raise ValidationError('La base debe coincidir con la ruta')
            row=c.execute("SELECT oid,datdba AS owner FROM pg_database WHERE datname=%s",(db,)).fetchone();identifier=ident(db)
        elif kind=='SCHEMA':
            if not schema or obj:raise ValidationError('Indica únicamente schema')
            row=c.execute('SELECT oid,nspowner AS owner FROM pg_namespace WHERE nspname=%s',(schema,)).fetchone();identifier=ident(schema)
        else:
            if not schema or not obj:raise ValidationError('Indica schema y object')
            types=['S'] if kind=='SEQUENCE' else ['r','p','v','m','f']
            row=c.execute('SELECT t.oid,t.relowner AS owner FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=%s AND t.relname=%s AND t.relkind::text=ANY(%s)',(schema,obj,types)).fetchone();identifier=ident(schema,obj)
        if not row:raise NotFoundError('Objeto no encontrado')
        return row['oid'],identifier
    def _acl(self,c,kind,oid,role=None):
        # Expand explicit ACL or PostgreSQL default ACL, including PUBLIC (OID zero).
        source={'DATABASE':('pg_database','datacl','datdba','d'),'SCHEMA':('pg_namespace','nspacl','nspowner','n'),'TABLE':('pg_class','relacl','relowner','r'),'SEQUENCE':('pg_class','relacl','relowner','s')}[kind]
        table,acl,owner,typ=source
        q=f"""SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,pg_get_userbyid(a.grantor) AS grantor,a.privilege_type AS privilege,a.is_grantable AS "grantable" FROM {table} o CROSS JOIN LATERAL aclexplode(COALESCE(o.{acl},acldefault('{typ}'::"char",o.{owner}))) a WHERE o.oid=%s AND a.privilege_type=ANY(%s) ORDER BY 1,3"""
        result=rows(c,q,(oid,PERMS[kind]))
        if role is not None:result=[r for r in result if r['grantee']==role or r['grantee']=='PUBLIC']
        return result
    def _effective(self,c,kind,oid,role):
        if role.upper()=='PUBLIC':raise ValidationError('Permisos efectivos requieren un rol real')
        if not c.execute('SELECT 1 FROM pg_roles WHERE rolname=%s',(role,)).fetchone():raise NotFoundError('Rol no encontrado')
        fn={'DATABASE':'has_database_privilege','SCHEMA':'has_schema_privilege','TABLE':'has_table_privilege','SEQUENCE':'has_sequence_privilege'}[kind]
        effective={p:c.execute(f'SELECT {fn}(%s::name,%s::oid,%s) AS allowed',(role,oid,p)).fetchone()['allowed'] for p in PERMS[kind]}
        groups=rows(c,"SELECT rolname AS name FROM pg_roles WHERE rolname<>%s AND pg_has_role(%s::name,oid,'USAGE') ORDER BY rolname",(role,role))
        inherited={g['name'] for g in groups}
        acl=self._acl(c,kind,oid)
        return {'role':role,'effective':effective,'groups':sorted(inherited),'grants':[a for a in acl if a['grantee'] in inherited|{role,'PUBLIC'}]}
    def list(self,s,db,kind,schema,obj,role):
        with self.access.connection(s,db) as c:
            oid,_=self._object(c,db,kind,schema,obj);return self._acl(c,kind,oid,role)
    def effective(self,s,db,kind,schema,obj,role):
        with self.access.connection(s,db) as c:
            oid,_=self._object(c,db,kind,schema,obj);return self._effective(c,kind,oid,role)
    def change(self,s,db,b,grant):
        kind=b.object_type;role=b.role;priv=b.privilege
        if priv not in PERMS[kind]:raise ValidationError('Permiso incompatible con el objeto')
        # Preserve the dedicated reader and administrator and groups inherited by them.
        profile=self.access.profiles.get_server(s)
        public=role=='PUBLIC'
        if not public:self.access.protect_role(s,role)
        if public and grant and priv in {'INSERT','UPDATE','DELETE'}:raise PermissionDeniedError('No se permite conceder escritura a PUBLIC')
        with self.access.connection(s,db) as c:
            oid,identifier=self._object(c,db,kind,b.schema_name,b.object_name)
            if not public:
                if not c.execute('SELECT 1 FROM pg_roles WHERE rolname=%s',(role,)).fetchone():raise NotFoundError('Rol no encontrado')
                for name in (profile.username,profile.reader_username):
                    if name and self.access.protected_membership(c,name,role):raise PermissionDeniedError('Rol heredado por una cuenta protegida')
            before={'grants':self._acl(c,kind,oid)} if public else self._effective(c,kind,oid,role)
            q='GRANT {} ON {} {} TO {}' if grant else 'REVOKE {} ON {} {} FROM {}'
            c.execute(sql.SQL(q).format(sql.SQL(priv),sql.SQL(kind),identifier,sql.SQL('PUBLIC') if public else ident(role)))
            after={'grants':self._acl(c,kind,oid)} if public else self._effective(c,kind,oid,role)
        return {'role':role,'privilege':priv,'objectType':kind,'before':before,'after':after}
