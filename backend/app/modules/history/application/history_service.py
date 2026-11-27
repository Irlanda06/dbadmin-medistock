from typing import Any

from app.core.exceptions import (
    AppError,
    NotFoundError,
    ValidationError
)

from app.modules.history.domain.contracts import (
    HistoryRepository
)

from app.modules.history.domain.entities import (
    OperationContext,
    OperationStatus,
    OperationRecord,
    HistoryFilter
)


class HistoryService:

    SAFE_ERRORS = {
        "VALIDATION_ERROR": "Datos de operación no válidos",
        "NODE_UNAVAILABLE": "Servidor no disponible",
        "DB_AUTH_FAILED": "Error de autenticación PostgreSQL",
        "INSUFFICIENT_PRIVILEGES": "Permisos insuficientes",
        "DATABASE_ERROR": "PostgreSQL rechazó la operación",
        "QUERY_TIMEOUT": "Tiempo de ejecución excedido",
        "READ_ONLY_VIOLATION": "Operación de escritura no permitida",
        "NOT_FOUND": "Recurso no encontrado",
        "CONFLICT": "Conflicto durante la operación",
        "STORAGE_ERROR": "Error de almacenamiento interno",
        "READER_NOT_CONFIGURED": "Usuario de lectura no configurado"
    }

    def __init__(
        self,
        repository: HistoryRepository
    ):
        self._repository = repository

    def begin(
        self,
        context: OperationContext
    ) -> int:

        return self._repository.create(
            context,
            OperationStatus.RUNNING
        )

    def enqueue(
        self,
        context: OperationContext
    ) -> int:

        return self._repository.create(
            context,
            OperationStatus.QUEUED
        )

    def start(
        self,
        operation_id: int
    ) -> None:

        self._repository.mark_running(
            operation_id
        )

    def succeed(
        self,
        operation_id: int,
        result: dict[str, Any] | None = None
    ) -> None:

        self._repository.mark_succeeded(
            operation_id,
            result
        )

    def fail(
        self,
        operation_id: int,
        exception: Exception
    ) -> None:

        error_code = "INTERNAL_ERROR"
        error_message = "La operación no pudo completarse"

        if isinstance(exception, AppError):

            if exception.code in self.SAFE_ERRORS:

                error_code = exception.code

                error_message = self.SAFE_ERRORS[
                    exception.code
                ]

        self._repository.mark_failed(
            operation_id,
            error_code,
            error_message
        )

    def get_operation(
        self,
        operation_id: int
    ) -> OperationRecord:

        operation = self._repository.find_by_id(
            operation_id
        )

        if operation is None:

            raise NotFoundError(
                "Operación no encontrada"
            )

        return operation

    def list_operations(
        self,
        filters: HistoryFilter
    ) -> dict:

        if not 1 <= filters.limit <= 200:

            raise ValidationError(
                "El límite debe estar entre 1 y 200"
            )

        if filters.offset < 0:

            raise ValidationError(
                "El desplazamiento no puede ser negativo"
            )

        operations = self._repository.find_all(
            filters
        )

        total = self._repository.count(
            filters
        )

        return {
            "items": [
                operation.to_public_dict()
                for operation in operations
            ],
            "total": total,
            "limit": filters.limit,
            "offset": filters.offset,
            "hasMore": (
                filters.offset + len(operations) < total
            )
        }