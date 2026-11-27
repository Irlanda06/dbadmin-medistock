import json
import sqlite3

from typing import Any

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError
)

from app.infrastructure.persistence.sqlite import (
    SQLiteDatabase
)

from app.modules.history.domain.entities import (
    OperationContext,
    OperationRecord,
    OperationStatus,
    HistoryFilter
)


class SQLiteHistoryRepository:

    def __init__(
        self,
        database: SQLiteDatabase
    ):
        self._database = database

    @staticmethod
    def _map_row(
        row: sqlite3.Row
    ) -> OperationRecord:

        return OperationRecord(
            id=row["id"],
            server_id=row["server_id"],
            server_name=row["server_name"],
            database_name=row["database_name"],
            operation_type=row["operation_type"],
            target_object=row["target_object"],
            executed_by=row["executed_by"],
            status=OperationStatus(row["status"]),
            error_code=row["error_code"],
            error_message=row["error_message"],
            result=(
                json.loads(row["result_json"])
                if row["result_json"] is not None
                else None
            ),
            created_at=row["created_at"],
            started_at=row["started_at"],
            finished_at=row["finished_at"]
        )

    @staticmethod
    def _build_filters(
        filters: HistoryFilter
    ) -> tuple[str, list]:

        conditions = []
        parameters = []

        if filters.server_id is not None:

            conditions.append("server_id = ?")
            parameters.append(filters.server_id)

        if filters.operation_type is not None:

            conditions.append("operation_type = ?")
            parameters.append(
                filters.operation_type.value
            )

        if filters.status is not None:

            conditions.append("status = ?")
            parameters.append(
                filters.status.value
            )

        where = ""

        if conditions:

            where = " WHERE " + " AND ".join(
                conditions
            )

        return where, parameters

    def find_all(
        self,
        filters: HistoryFilter
    ) -> list[OperationRecord]:

        where, parameters = self._build_filters(
            filters
        )

        query = f"""
            SELECT *
            FROM operation_history
            {where}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """

        parameters.extend([
            filters.limit,
            filters.offset
        ])

        with self._database.connection() as connection:

            rows = connection.execute(
                query,
                parameters
            ).fetchall()

            return [
                self._map_row(row)
                for row in rows
            ]

    def count(
        self,
        filters: HistoryFilter
    ) -> int:

        where, parameters = self._build_filters(
            filters
        )

        with self._database.connection() as connection:

            row = connection.execute(
                f"""
                    SELECT COUNT(*) AS total
                    FROM operation_history
                    {where}
                """,
                parameters
            ).fetchone()

            return row["total"]

    def find_by_id(
        self,
        operation_id: int
    ) -> OperationRecord | None:

        with self._database.connection() as connection:

            row = connection.execute("""
                SELECT *
                FROM operation_history
                WHERE id = ?
            """, (operation_id,)).fetchone()

            if row is None:
                return None

            return self._map_row(row)

    def create(
        self,
        context: OperationContext,
        status: OperationStatus
    ) -> int:

        if status not in (
            OperationStatus.QUEUED,
            OperationStatus.RUNNING
        ):

            raise ValidationError(
                "Estado inicial de operación no válido"
            )

        with self._database.connection() as connection:

            cursor = connection.execute("""
                INSERT INTO operation_history (
                    server_id,
                    server_name,
                    database_name,
                    operation_type,
                    target_object,
                    executed_by,
                    status,
                    started_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    CASE
                        WHEN ? = 'RUNNING'
                        THEN CURRENT_TIMESTAMP
                        ELSE NULL
                    END
                )
            """, (
                context.server_id,
                context.server_name,
                context.database_name,
                context.operation_type.value,
                context.target_object,
                context.executed_by,
                status.value,
                status.value
            ))

            return cursor.lastrowid

    @staticmethod
    def _validate_transition(
        connection: sqlite3.Connection,
        cursor: sqlite3.Cursor,
        operation_id: int
    ) -> None:

        if cursor.rowcount > 0:
            return

        row = connection.execute("""
            SELECT status
            FROM operation_history
            WHERE id = ?
        """, (operation_id,)).fetchone()

        if row is None:

            raise NotFoundError(
                "Operación no encontrada"
            )

        raise ConflictError(
            "La operación no permite este cambio de estado"
        )

    def mark_running(
        self,
        operation_id: int
    ) -> None:

        with self._database.connection() as connection:

            cursor = connection.execute("""
                UPDATE operation_history
                SET status = 'RUNNING',
                    started_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND status = 'QUEUED'
            """, (operation_id,))

            self._validate_transition(
                connection,
                cursor,
                operation_id
            )

    def mark_succeeded(
        self,
        operation_id: int,
        result: dict[str, Any] | None = None
    ) -> None:

        result_json = (
            json.dumps(
                result,
                ensure_ascii=False,
                allow_nan=False
            )
            if result is not None
            else None
        )

        with self._database.connection() as connection:

            cursor = connection.execute("""
                UPDATE operation_history
                SET status = 'SUCCEEDED',
                    result_json = ?,
                    error_code = NULL,
                    error_message = NULL,
                    finished_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND status = 'RUNNING'
            """, (
                result_json,
                operation_id
            ))

            self._validate_transition(
                connection,
                cursor,
                operation_id
            )

    def mark_failed(
        self,
        operation_id: int,
        error_code: str,
        error_message: str
    ) -> None:

        with self._database.connection() as connection:

            cursor = connection.execute("""
                UPDATE operation_history
                SET status = 'FAILED',
                    error_code = ?,
                    error_message = ?,
                    result_json = NULL,
                    finished_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND status IN ('QUEUED', 'RUNNING')
            """, (
                error_code,
                error_message,
                operation_id
            ))

            self._validate_transition(
                connection,
                cursor,
                operation_id
            )