import sqlite3

from app.core.exceptions import (
    ConflictError,
    NotFoundError
)

from app.infrastructure.persistence.sqlite import (
    SQLiteDatabase
)

from app.modules.servers.domain.entities import (
    ProfileData,
    ServerProfile
)


class SQLiteServerRepository:

    def __init__(
        self,
        database: SQLiteDatabase
    ):
        self._database = database

    @staticmethod
    def _map_row(row: sqlite3.Row) -> ServerProfile:

        return ServerProfile(
            id=row["id"],
            name=row["name"],
            host=row["host"],
            port=row["port"],
            database_name=row["database_name"],
            username=row["username"],
            encrypted_password=row["encrypted_password"],
            reader_username=row["reader_username"],
            encrypted_reader_password=(
                row["encrypted_reader_password"]
            ),
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

    @staticmethod
    def _values(data: ProfileData) -> tuple:

        return (
            data.name,
            data.host,
            data.port,
            data.database_name,
            data.username,
            data.encrypted_password,
            data.reader_username,
            data.encrypted_reader_password
        )

    def find_all(self) -> list[ServerProfile]:

        with self._database.connection() as connection:

            rows = connection.execute("""
                SELECT *
                FROM connection_profiles
                WHERE deleted_at IS NULL
                ORDER BY name COLLATE NOCASE
            """).fetchall()

            return [
                self._map_row(row)
                for row in rows
            ]

    def find_by_id(
        self,
        server_id: int
    ) -> ServerProfile | None:

        with self._database.connection() as connection:

            row = connection.execute("""
                SELECT *
                FROM connection_profiles
                WHERE id = ?
                  AND deleted_at IS NULL
            """, (server_id,)).fetchone()

            if row is None:
                return None

            return self._map_row(row)

    def create(
        self,
        data: ProfileData
    ) -> ServerProfile:

        try:

            with self._database.connection() as connection:

                cursor = connection.execute("""
                    INSERT INTO connection_profiles (
                        name,
                        host,
                        port,
                        database_name,
                        username,
                        encrypted_password,
                        reader_username,
                        encrypted_reader_password
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, self._values(data))

                row = connection.execute("""
                    SELECT *
                    FROM connection_profiles
                    WHERE id = ?
                """, (cursor.lastrowid,)).fetchone()

                return self._map_row(row)

        except sqlite3.IntegrityError:

            raise ConflictError(
                "El perfil ya existe o sus datos no son válidos"
            ) from None

    def update(
        self,
        server_id: int,
        data: ProfileData
    ) -> ServerProfile:

        try:

            with self._database.connection() as connection:

                cursor = connection.execute("""
                    UPDATE connection_profiles
                    SET
                        name = ?,
                        host = ?,
                        port = ?,
                        database_name = ?,
                        username = ?,
                        encrypted_password = ?,
                        reader_username = ?,
                        encrypted_reader_password = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND deleted_at IS NULL
                """, (*self._values(data), server_id))

                if cursor.rowcount == 0:

                    raise NotFoundError(
                        "Servidor no encontrado"
                    )

                row = connection.execute("""
                    SELECT *
                    FROM connection_profiles
                    WHERE id = ?
                """, (server_id,)).fetchone()

                return self._map_row(row)

        except sqlite3.IntegrityError:

            raise ConflictError(
                "El perfil ya existe o sus datos no son válidos"
            ) from None

    def delete(
        self,
        server_id: int
    ) -> None:

        with self._database.connection() as connection:

            cursor = connection.execute("""
                UPDATE connection_profiles
                SET
                    deleted_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND deleted_at IS NULL
            """, (server_id,))

            if cursor.rowcount == 0:

                raise NotFoundError(
                    "Servidor no encontrado"
                )