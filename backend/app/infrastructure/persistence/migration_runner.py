import sqlite3

from pathlib import Path

from app.core.exceptions import StorageError

from app.infrastructure.persistence.sqlite import (
    SQLiteDatabase
)


class SQLiteMigrationRunner:

    def __init__(
        self,
        database: SQLiteDatabase,
        migrations_path: Path
    ):

        self._database = database
        self._migrations_path = migrations_path

    def migrate(self) -> None:

        migrations = sorted(
            self._migrations_path.glob("*.sql")
        )

        if not migrations:

            raise StorageError()

        self._initialize_migrations_table()

        for migration in migrations:

            self._apply_migration(migration)

    def _initialize_migrations_table(self) -> None:

        with self._database.connection() as connection:

            connection.execute(
                "PRAGMA journal_mode = WAL"
            )

            connection.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TEXT NOT NULL
                        DEFAULT CURRENT_TIMESTAMP
                )
            """)

    def _apply_migration(
        self,
        migration: Path
    ) -> None:

        try:

            script = migration.read_text(
                encoding="utf-8"
            )

        except OSError:

            raise StorageError() from None

        with self._database.connection() as connection:

            connection.execute("BEGIN IMMEDIATE")

            applied = connection.execute("""
                SELECT 1
                FROM schema_migrations
                WHERE version = ?
            """, (migration.name,)).fetchone()

            if applied:

                return

            self._execute_script(
                connection,
                script
            )

            connection.execute("""
                INSERT INTO schema_migrations (
                    version
                )
                VALUES (?)
            """, (migration.name,))

    @staticmethod
    def _execute_script(
        connection: sqlite3.Connection,
        script: str
    ) -> None:

        statement = ""

        for character in script:

            statement += character

            if (
                character == ";"
                and sqlite3.complete_statement(statement)
            ):

                connection.execute(statement)

                statement = ""

        if statement.strip():

            raise StorageError()