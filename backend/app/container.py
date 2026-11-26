from dataclasses import dataclass
from pathlib import Path

from app.config import Settings

from app.core.contracts import (
    PasswordEncryptor,
    PasswordDecryptor,
    HostValidator,
    MigrationRunner,
    ResourceManager,
    ServerProbe,
    ServerConnectionControl,
    DatabaseCatalog
)

from app.infrastructure.persistence.sqlite import (
    SQLiteDatabase
)

from app.infrastructure.persistence.migration_runner import (
    SQLiteMigrationRunner
)

from app.infrastructure.security.fernet_cipher import (
    FernetCipher
)

from app.infrastructure.security.network_validator import (
    NetworkValidator
)

from app.infrastructure.postgres.error_mapper import (
    PostgresErrorMapper
)

from app.infrastructure.postgres.connection_factory import (
    PostgresConnectionFactory
)

from app.infrastructure.postgres.connection_manager import (
    PostgresConnectionManager
)

from app.infrastructure.postgres.server_gateway import (
    PostgresServerGateway
)

from app.infrastructure.postgres.sql_builder import (
    PostgresSQLBuilder
)

from app.modules.servers.domain.contracts import (
    ServerRepository
)

from app.modules.servers.infrastructure.repository import (
    SQLiteServerRepository
)

from app.modules.servers.application.profile_service import (
    ProfileService
)

from app.modules.servers.application.connection_service import (
    ConnectionService
)

from app.modules.history.domain.contracts import (
    HistoryRepository
)

from app.modules.history.infrastructure.repository import (
    SQLiteHistoryRepository
)

from app.modules.history.application.history_service import (
    HistoryService
)

from app.modules._shared.composition import (
    FeatureServices,
    build_features
)


@dataclass(frozen=True)
class ApplicationContainer:

    # Configuracion

    settings: Settings

    # Persistencia

    sqlite_database: SQLiteDatabase

    migration_runner: MigrationRunner

    # Seguridad

    password_encryptor: PasswordEncryptor

    password_decryptor: PasswordDecryptor

    host_validator: HostValidator

    # Infraestructura PostgreSQL

    postgres_factory: PostgresConnectionFactory

    postgres_manager: PostgresConnectionManager

    postgres_sql_builder: PostgresSQLBuilder

    server_probe: ServerProbe

    server_connection_control: ServerConnectionControl

    database_catalog: DatabaseCatalog

    resource_manager: ResourceManager

    # Modulo Servers

    server_repository: ServerRepository

    profile_service: ProfileService

    connection_service: ConnectionService

    # Modulo History

    history_repository: HistoryRepository

    history_service: HistoryService

    # Modulos administrativos

    features: FeatureServices


def build_container(
    settings: Settings
) -> ApplicationContainer:

    # Directorios locales

    settings.storage_path.mkdir(
        parents=True,
        exist_ok=True
    )

    settings.database_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    settings.backup_path.mkdir(
        parents=True,
        exist_ok=True
    )

    # Persistencia SQLite

    database = SQLiteDatabase(
        database_path=settings.database_path
    )

    migrations_path = (
        Path(__file__).resolve().parent
        / "infrastructure"
        / "persistence"
        / "migrations"
    )

    migration_runner = SQLiteMigrationRunner(
        database=database,
        migrations_path=migrations_path
    )

    # Seguridad

    cipher = FernetCipher(
        encryption_key=(
            settings.ENCRYPTION_KEY.get_secret_value()
        )
    )

    host_validator = NetworkValidator(
        allowed_networks=settings.allowed_networks
    )

    # Infraestructura PostgreSQL

    error_mapper = PostgresErrorMapper()

    postgres_factory = PostgresConnectionFactory(
        host_validator=host_validator,
        error_mapper=error_mapper,
        connect_timeout=settings.DB_CONNECT_TIMEOUT,
        query_timeout_ms=settings.QUERY_TIMEOUT_MS
    )

    postgres_manager = PostgresConnectionManager(
        factory=postgres_factory,
        error_mapper=error_mapper,
        min_size=settings.POOL_MIN_SIZE,
        max_size=settings.POOL_MAX_SIZE,
        timeout=settings.POOL_TIMEOUT
    )

    postgres_gateway = PostgresServerGateway(
        factory=postgres_factory,
        manager=postgres_manager
    )

    postgres_sql_builder = PostgresSQLBuilder()

    # Modulo Servers

    server_repository = SQLiteServerRepository(
        database=database
    )

    profile_service = ProfileService(
        repository=server_repository,
        password_encryptor=cipher,
        host_validator=host_validator,
        connection_control=postgres_gateway
    )

    connection_service = ConnectionService(
        repository=server_repository,
        password_decryptor=cipher,
        server_probe=postgres_gateway,
        connection_control=postgres_gateway,
        database_catalog=postgres_gateway
    )

    # Modulo History

    history_repository = SQLiteHistoryRepository(
        database=database
    )

    history_service = HistoryService(
        repository=history_repository
    )

    # Modulos administrativos

    features = build_features(
        settings=settings,
        sqlite=database,
        profile_service=profile_service,
        connection_service=connection_service,
        postgres_factory=postgres_factory,
        history_service=history_service
    )

    # Contenedor principal

    return ApplicationContainer(

        settings=settings,

        sqlite_database=database,

        migration_runner=migration_runner,

        password_encryptor=cipher,

        password_decryptor=cipher,

        host_validator=host_validator,

        postgres_factory=postgres_factory,

        postgres_manager=postgres_manager,

        postgres_sql_builder=postgres_sql_builder,

        server_probe=postgres_gateway,

        server_connection_control=postgres_gateway,

        database_catalog=postgres_gateway,

        resource_manager=postgres_manager,

        server_repository=server_repository,

        profile_service=profile_service,

        connection_service=connection_service,

        history_repository=history_repository,

        history_service=history_service,

        features=features
    )