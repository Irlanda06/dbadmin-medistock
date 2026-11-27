class AppError(Exception):

    def __init__(
        self,
        code: str,
        message: str
    ):

        super().__init__(message)

        self.code = code
        self.message = message


class ValidationError(AppError):

    def __init__(self, message: str):

        super().__init__(
            "VALIDATION_ERROR",
            message
        )


class NotFoundError(AppError):

    def __init__(self, message: str):

        super().__init__(
            "NOT_FOUND",
            message
        )


class ConflictError(AppError):

    def __init__(self, message: str):

        super().__init__(
            "CONFLICT",
            message
        )


class PermissionDeniedError(AppError):

    def __init__(self, message: str):

        super().__init__(
            "INSUFFICIENT_PRIVILEGES",
            message
        )


class ConnectionUnavailableError(AppError):

    def __init__(self, message: str):

        super().__init__(
            "NODE_UNAVAILABLE",
            message
        )


class DatabaseAuthenticationError(AppError):

    def __init__(self):

        super().__init__(
            "DB_AUTH_FAILED",
            "Credenciales PostgreSQL incorrectas"
        )


class DatabaseOperationError(AppError):

    def __init__(self, message: str):

        super().__init__(
            "DATABASE_ERROR",
            message
        )


class QueryTimeoutError(AppError):

    def __init__(self):

        super().__init__(
            "QUERY_TIMEOUT",
            "Tiempo de ejecución excedido"
        )


class ReadOnlyViolationError(AppError):

    def __init__(self):

        super().__init__(
            "READ_ONLY_VIOLATION",
            "Operación no permitida en modo lectura"
        )


class StorageError(AppError):

    def __init__(self):

        super().__init__(
            "STORAGE_ERROR",
            "Error en el almacenamiento interno"
        )