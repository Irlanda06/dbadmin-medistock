from app.modules.privileges.domain.contracts import PrivilegeGateway
class PrivilegeService:
    def __init__(self,gateway:PrivilegeGateway,access):self.gateway=gateway;self.access=access
    def list(self,*args):return self.gateway.list(*args)
    def effective(self,*args):return self.gateway.effective(*args)
    def change(self,s,db,b,grant):
        target='.'.join(x for x in (b.schema_name,b.object_name) if x) or db
        with self.access.audit(s,db,'GRANT' if grant else 'REVOKE',target) as meta:
            result=self.gateway.change(s,db,b,grant);meta.update(result)
        return result
