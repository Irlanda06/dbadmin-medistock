from typing import Any

from app.core.contracts import (
    PostgresCredentials
)

from app.infrastructure.postgres.connection_factory import (
    PostgresConnectionFactory
)

from app.infrastructure.postgres.connection_manager import (
    PostgresConnectionManager
)


class PostgresServerGateway:

    def __init__(
        self,
        factory: PostgresConnectionFactory,
        manager: PostgresConnectionManager
    ):

        self._factory = factory
        self._manager = manager

    def test(
        self,
        credentials: PostgresCredentials
    ) -> dict[str, Any]:

        with self._factory.connection(

            credentials=credentials,

            autocommit=True,

            limited=True

        ) as connection:

            result = connection.execute("""
                SELECT
                    current_setting(
                        'server_version'
                    ) AS version,

                    current_setting(
                        'server_version_num'
                    )::integer AS "versionNumber",

                    current_database()
                        AS database,

                    current_user
                        AS username,

                    session_user
                        AS "sessionUser",

                    host(inet_server_addr())
                        AS "serverAddress",

                    inet_server_port()
                        AS "serverPort"
            """).fetchone()

            return {

                **result,

                "reachable": True,

                "status": "ONLINE"
            }

    def connect(
        self,
        server_id: int,
        credentials: PostgresCredentials
    ) -> dict[str, Any]:

        information = self.test(
            credentials
        )

        self._manager.connect(
            server_id,
            credentials
        )

        return {

            "serverId": server_id,

            "connected": True,

            **information
        }

    def disconnect(
        self,
        server_id: int
    ) -> None:

        self._manager.disconnect(
            server_id
        )

    def is_connected(
        self,
        server_id: int
    ) -> bool:

        return self._manager.is_connected(
            server_id
        )

    def list_databases(
        self,
        server_id: int,
        credentials: PostgresCredentials
    ) -> list[dict[str, Any]]:

        with self._manager.connection(

            credentials=credentials,

            server_id=server_id,

            limited=True

        ) as connection:

            rows = connection.execute("""
                SELECT
                    d.datname AS name,

                    pg_get_userbyid(
                        d.datdba
                    ) AS owner,

                    pg_encoding_to_char(
                        d.encoding
                    ) AS encoding,

                    d.datcollate AS collation,

                    d.datallowconn
                        AS "allowConnections",

                    has_database_privilege(
                        current_user,
                        d.oid,
                        'CONNECT'
                    ) AS "canConnect"

                FROM pg_database d

                WHERE d.datistemplate = FALSE

                ORDER BY d.datname
            """).fetchall()

            return rows