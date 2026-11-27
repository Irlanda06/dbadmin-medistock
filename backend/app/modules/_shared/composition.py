from dataclasses import dataclass
from app.modules._shared.common import Access
from app.modules.explorer.application.service import ExplorerService
from app.modules.explorer.infrastructure.gateway import PostgresExplorerGateway
from app.modules.backups.application.service import BackupService
from app.modules.backups.infrastructure.repository import SQLiteBackupRepository
from app.modules.backups.infrastructure.postgres_tools import PostgresTools
from app.modules.restores.application.service import RestoreService
from app.modules.restores.infrastructure.repository import SQLiteRestoreRepository
from app.modules.roles.application.service import RoleService
from app.modules.roles.infrastructure.gateway import PostgresRoleGateway
from app.modules.privileges.application.service import PrivilegeService
from app.modules.privileges.infrastructure.gateway import PostgresPrivilegeGateway
from app.modules.maintenance.application.service import MaintenanceService
from app.modules.maintenance.infrastructure.gateway import PostgresMaintenanceGateway
from app.modules.monitoring.application.service import MonitoringService
from app.modules.monitoring.infrastructure.gateway import PostgresMonitoringGateway
from app.modules.distributed.application.service import DistributedService
from app.modules.distributed.infrastructure.gateway import PostgresDistributedGateway

@dataclass(frozen=True)
class FeatureServices:
    explorer:ExplorerService
    backups:BackupService
    restores:RestoreService
    roles:RoleService
    privileges:PrivilegeService
    maintenance:MaintenanceService
    monitoring:MonitoringService
    distributed:DistributedService

def build_features(settings,sqlite,profile_service,connection_service,postgres_factory,history_service):
    access=Access(profile_service,connection_service,postgres_factory,history_service,settings,sqlite)
    tools=PostgresTools(postgres_factory)
    backups=BackupService(SQLiteBackupRepository(sqlite),access,tools)
    return FeatureServices(
        explorer=ExplorerService(PostgresExplorerGateway(access),access),
        backups=backups,
        restores=RestoreService(SQLiteRestoreRepository(sqlite),backups,access,tools),
        roles=RoleService(PostgresRoleGateway(access),access),
        privileges=PrivilegeService(PostgresPrivilegeGateway(access),access),
        maintenance=MaintenanceService(PostgresMaintenanceGateway(access),access),
        monitoring=MonitoringService(PostgresMonitoringGateway(access)),
        distributed=DistributedService(PostgresDistributedGateway(access),access))

def recover_interrupted(sqlite):
    # Single Uvicorn worker only. Never replay a restore or overwrite a database.
    with sqlite.connection() as c:
        c.execute("UPDATE backups SET status='FAILED',finished_at=CURRENT_TIMESTAMP WHERE status IN ('QUEUED','RUNNING')")
        c.execute("UPDATE restores SET status='FAILED',finished_at=CURRENT_TIMESTAMP WHERE status IN ('QUEUED','RUNNING')")
        c.execute("UPDATE operation_history SET status='FAILED',error_code='INTERRUPTED',error_message='Backend reiniciado; verificar efectos antes de reintentar',finished_at=CURRENT_TIMESTAMP WHERE status IN ('QUEUED','RUNNING')")
