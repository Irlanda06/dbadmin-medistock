from app.core.contracts import (
    PasswordDecryptor,
    PostgresCredentials,
    ServerProbe,
    ServerConnectionControl,
    DatabaseCatalog
)

from app.core.exceptions import (
    AppError,
    NotFoundError
)

from app.core.validators import (
    validate_identifier
)

from app.modules.servers.domain.contracts import (
    ServerRepository
)

from app.modules.servers.domain.entities import (
    ServerProfile
)


class ConnectionService:

    def __init__(
        self,
        repository: ServerRepository,
        password_decryptor: PasswordDecryptor,
        server_probe: ServerProbe,
        connection_control: ServerConnectionControl,
        database_catalog: DatabaseCatalog
    ):

        self._repository = repository
        self._password_decryptor = password_decryptor
        self._server_probe = server_probe
        self._connection_control = connection_control
        self._database_catalog = database_catalog

    def _get_profile(
        self,
        server_id: int
    ) -> ServerProfile:

        profile = self._repository.find_by_id(
            server_id
        )

        if profile is None:

            raise NotFoundError(
                "Servidor no encontrado"
            )

        return profile

    def get_credentials(
        self,
        server_id: int,
        database: str | None = None,
        readonly: bool = False
    ) -> PostgresCredentials:

        profile = self._get_profile(server_id)

        database_name = (
            database
            if database is not None
            else profile.database_name
        )

        validate_identifier(database_name)

        if readonly:

            if (
                profile.reader_username is None
                or profile.encrypted_reader_password is None
            ):

                raise AppError(
                    "READER_NOT_CONFIGURED",
                    "El servidor no tiene configurado "
                    "un usuario de lectura"
                )

            username = profile.reader_username

            encrypted_password = (
                profile.encrypted_reader_password
            )

        else:

            username = profile.username

            encrypted_password = (
                profile.encrypted_password
            )

        password = self._password_decryptor.decrypt(
            encrypted_password
        )

        return PostgresCredentials(
            host=profile.host,
            port=profile.port,
            database=database_name,
            username=username,
            password=password
        )

    def test_credentials(
        self,
        credentials: PostgresCredentials
    ) -> dict:

        return self._server_probe.test(
            credentials
        )

    def test_server(
        self,
        server_id: int
    ) -> dict:

        credentials = self.get_credentials(
            server_id
        )

        information = self._server_probe.test(
            credentials
        )

        return {
            "serverId": server_id,
            **information
        }

    def connect(
        self,
        server_id: int
    ) -> dict:

        credentials = self.get_credentials(
            server_id
        )

        return self._connection_control.connect(
            server_id,
            credentials
        )

    def disconnect(
        self,
        server_id: int
    ) -> dict:

        self._get_profile(server_id)

        self._connection_control.disconnect(
            server_id
        )

        return {
            "serverId": server_id,
            "connected": False,
            "poolOpen": False
        }

    def get_status(
        self,
        server_id: int
    ) -> dict:

        credentials = self.get_credentials(
            server_id
        )

        pool_open = self._connection_control.is_connected(
            server_id
        )

        try:

            information = self._server_probe.test(
                credentials
            )

            return {
                "serverId": server_id,
                **information,
                "poolOpen": pool_open,
                "connected": pool_open
            }

        except AppError as exception:

            if exception.code == "NODE_UNAVAILABLE":

                status = "UNREACHABLE"
                reachable = False

            elif exception.code == "DB_AUTH_FAILED":

                status = "AUTH_FAILED"
                reachable = True

            elif exception.code in {
                "QUERY_TIMEOUT",
                "DATABASE_ERROR",
                "NOT_FOUND",
                "INSUFFICIENT_PRIVILEGES"
            }:

                status = "ERROR"
                reachable = None

            else:
                raise

            return {
                "serverId": server_id,
                "poolOpen": pool_open,
                "connected": False,
                "reachable": reachable,
                "status": status,
                "error": {
                    "code": exception.code,
                    "message": exception.message
                }
            }

    def get_info(
        self,
        server_id: int
    ) -> dict:

        profile = self._get_profile(server_id)

        information = self.test_server(
            server_id
        )

        return {
            "profile": profile.to_public_dict(),
            "server": information
        }

    def list_databases(
        self,
        server_id: int
    ) -> list[dict]:

        credentials = self.get_credentials(
            server_id
        )

        return self._database_catalog.list_databases(
            server_id,
            credentials
        )