from app.modules.roles.domain.contracts import RoleGateway
class RoleService:
    def __init__(self,gateway:RoleGateway,access):self.gateway=gateway;self.access=access
    def list(self,s):return self.gateway.list(s)
    def get(self,s,r):return self.gateway.get(s,r)
    def members(self,s,r):return self.gateway.members(s,r)
    def create(self,s,b):
        with self.access.audit(s,None,'CREATE_ROLE',b.name) as meta:
            result=self.gateway.create(s,b);meta.update(result)
        return result
    def update(self,s,r,b):
        with self.access.audit(s,None,'UPDATE_ROLE',r) as meta:
            result=self.gateway.update(s,r,b);meta.update(result)
        return result
    def password(self,s,r,p):
        with self.access.audit(s,None,'CHANGE_PASSWORD',r) as meta:
            result=self.gateway.password(s,r,p);meta.update(result)
        return result
    def membership(self,s,r,m,grant):
        with self.access.audit(s,None,'ADD_ROLE_MEMBER' if grant else 'REMOVE_ROLE_MEMBER',r) as meta:
            result=self.gateway.membership(s,r,m,grant);meta.update(result)
        return result
