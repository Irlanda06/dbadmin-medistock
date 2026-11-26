from app.modules.distributed.domain.contracts import DistributedGateway
class DistributedService:
    def __init__(self,gateway:DistributedGateway,access):self.gateway=gateway;self.access=access
    def _run(self,s,db,operation,target,fn,*args):
        with self.access.audit(s,db,operation,target) as meta:
            result=fn(s,db,*args);meta.update(result)
        return result
    def extension(self,s,db):return self._run(s,db,'CREATE_EXTENSION','postgres_fdw',self.gateway.extension)
    def servers(self,s,db):return self.gateway.servers(s,db)
    def create_server(self,s,db,b):return self._run(s,db,'CREATE_FOREIGN_SERVER',b.name,self.gateway.create_server,b)
    def mappings(self,s,db):return self.gateway.mappings(s,db)
    def mapping(self,s,db,b):return self._run(s,db,'CREATE_USER_MAPPING',b.server,self.gateway.mapping,b)
    def foreign_tables(self,s,db):return self.gateway.foreign_tables(s,db)
    def foreign_table(self,s,db,b):return self._run(s,db,'CREATE_FOREIGN_TABLE',f'{b.local_schema}.{b.local_table}',self.gateway.foreign_table,b)
    def test(self,s,db,b):return self.gateway.test(s,db,b)
    def view(self,s,db,b):return self._run(s,db,'CREATE_DISTRIBUTED_VIEW',f'{b.schema_name}.{b.name}',self.gateway.view,b)
    def inventory(self,*args):return self.gateway.inventory(*args)
