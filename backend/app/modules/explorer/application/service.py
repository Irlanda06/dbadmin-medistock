from app.modules.explorer.domain.contracts import ExplorerGateway
class ExplorerService:
    def __init__(self,gateway:ExplorerGateway,access): self.gateway=gateway; self.access=access
    def catalog(self,*args): return self.gateway.catalog(*args)
    def columns(self,*args): return self.gateway.columns(*args)
    def data(self,*args): return self.gateway.data(*args)
    def query(self,server_id,database,statement,limit):
        # Do not persist query text or rows, which may contain sensitive data.
        with self.access.audit(server_id,database,'SQL_QUERY',readonly=True) as meta:
            result=self.gateway.query(server_id,database,statement,limit)
            meta.update(rowCount=result['rowCount'],hasMore=result['hasMore'])
        return result
