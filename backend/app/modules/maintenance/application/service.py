from app.modules.history.domain.entities import HistoryFilter,OperationType
from app.modules.maintenance.domain.contracts import MaintenanceGateway
class MaintenanceService:
    def __init__(self,gateway:MaintenanceGateway,access):self.gateway=gateway;self.access=access
    def execute(self,s,db,b,vacuum):
        with self.access.audit(s,db,'VACUUM' if vacuum else 'ANALYZE',f'{b.schema_name}.{b.table}') as meta:
            result=self.gateway.execute(s,db,b.schema_name,b.table,vacuum);meta.update(result)
        return result
    def statistics(self,*args):return self.gateway.statistics(*args)
    def history(self,s,limit,offset):
        self.access.profiles.get_server(s)
        # Exact SQL filtering and stable pagination across both maintenance types.
        return self.gateway.history(s,limit,offset)
