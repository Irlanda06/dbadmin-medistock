from app.modules.monitoring.domain.contracts import MonitoringGateway
from app.core.exceptions import NotFoundError
class MonitoringService:
    def __init__(self,gateway:MonitoringGateway):self.gateway=gateway
    def sessions(self,s):return self.gateway.sessions(s)
    def session(self,s,pid):
        result=self.gateway.sessions(s,pid)
        if not result:raise NotFoundError('Sesión no encontrada')
        return result[0]
    def locks(self,s):return self.gateway.locks(s)
