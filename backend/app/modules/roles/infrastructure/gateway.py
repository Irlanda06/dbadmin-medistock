from psycopg import sql
from app.modules._shared.common import ident,rows,one
from app.core.exceptions import NotFoundError,ValidationError,PermissionDeniedError

ROLE_SQL="""SELECT rolname AS name,rolcanlogin AS login,rolinherit AS inherit,rolcreatedb AS "createDb",rolcreaterole AS "createRole",rolsuper AS superuser,rolreplication AS replication,rolbypassrls AS "bypassRls",rolconnlimit AS "connectionLimit",rolvaliduntil AS "validUntil" FROM pg_roles"""
class PostgresRoleGateway:
    def __init__(self,access): self.access=access
    def list(self,s):
        with self.access.connection(s) as c: return rows(c,ROLE_SQL+' ORDER BY rolname')
    def _get(self,c,role):
        result=one(c,ROLE_SQL+' WHERE rolname=%s',(role,))
        if result is None: raise NotFoundError('Rol no encontrado')
        return result
    def get(self,s,role):
        with self.access.connection(s) as c: return self._get(c,role)
    def _protect(self,s,c,role):
        self.access.protect_role(s,role)
        data=self._get(c,role)
        if data['superuser'] or data['replication'] or data['bypassRls']: raise PermissionDeniedError('Rol administrativo protegido')
        # Do not mutate a group inherited by the application reader or administrator.
        profile=self.access.profiles.get_server(s)
        for name in (profile.reader_username,profile.username):
            if name and self.access.protected_membership(c,name,role):
                raise PermissionDeniedError('Rol heredado por una cuenta protegida')
        return data
    @staticmethod
    def _attrs(body):
        options=[]
        for field,word in [('login','LOGIN'),('inherit','INHERIT'),('create_db','CREATEDB'),('create_role','CREATEROLE')]:
            value=getattr(body,field,None)
            if value is not None: options.append(sql.SQL(word if value else 'NO'+word))
        return options
    def create(self,s,body):
        self.access.protect_role(s,body.name)
        if body.login and body.password is None: raise ValidationError('Un usuario LOGIN requiere contraseña')
        if not body.login and body.password is not None: raise ValidationError('Un grupo NOLOGIN no requiere contraseña')
        opts=self._attrs(body)+[sql.SQL('NOSUPERUSER NOREPLICATION NOBYPASSRLS')]
        with self.access.connection(s) as c:
            if body.password is not None:
                enc=c.info.encoding
                verifier=c.pgconn.encrypt_password(body.password.get_secret_value().encode(enc),body.name.encode(enc),b'scram-sha-256').decode(enc)
                opts.extend([sql.SQL('PASSWORD'),sql.Literal(verifier)])
            c.execute(sql.SQL('CREATE ROLE {} WITH {}').format(ident(body.name),sql.SQL(' ').join(opts)))
            return self._get(c,body.name)
    def update(self,s,role,body):
        opts=self._attrs(body)
        if not opts: raise ValidationError('No se indicaron atributos')
        with self.access.connection(s) as c:
            self._protect(s,c,role)
            c.execute(sql.SQL('ALTER ROLE {} WITH {}').format(ident(role),sql.SQL(' ').join(opts)))
            return self._get(c,role)
    def password(self,s,role,password):
        with self.access.connection(s) as c:
            self._protect(s,c,role)
            enc=c.info.encoding
            verifier=c.pgconn.encrypt_password(password.encode(enc),role.encode(enc),b'scram-sha-256').decode(enc)
            c.execute(sql.SQL('ALTER ROLE {} PASSWORD {}').format(ident(role),sql.Literal(verifier)))
        return {'role':role,'passwordChanged':True}
    def members(self,s,role):
        with self.access.connection(s) as c:
            self._get(c,role)
            return rows(c,"""SELECT r.rolname AS role,m.rolname AS member,g.rolname AS grantor,a.admin_option AS "adminOption",a.inherit_option AS "inheritOption",a.set_option AS "setOption" FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member JOIN pg_roles g ON g.oid=a.grantor WHERE r.rolname=%s ORDER BY m.rolname""",(role,))
    def membership(self,s,role,member,grant):
        with self.access.connection(s) as c:
            self._protect(s,c,role);self._protect(s,c,member)
            command='GRANT {} TO {}' if grant else 'REVOKE {} FROM {}'
            c.execute(sql.SQL(command).format(ident(role),ident(member)))
            present=c.execute("SELECT EXISTS(SELECT 1 FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member WHERE r.rolname=%s AND m.rolname=%s) AS present",(role,member)).fetchone()['present']
        return {'role':role,'member':member,'directMembership':present}
