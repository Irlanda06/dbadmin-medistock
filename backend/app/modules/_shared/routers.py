from app.modules.explorer.presentation.router import router as explorer
from app.modules.backups.presentation.router import router as backups
from app.modules.restores.presentation.router import router as restores
from app.modules.roles.presentation.router import router as roles
from app.modules.privileges.presentation.router import router as privileges
from app.modules.maintenance.presentation.router import router as maintenance
from app.modules.monitoring.presentation.router import router as monitoring
from app.modules.distributed.presentation.router import router as distributed
FEATURE_ROUTERS=(explorer,backups,restores,roles,privileges,maintenance,monitoring,distributed)
