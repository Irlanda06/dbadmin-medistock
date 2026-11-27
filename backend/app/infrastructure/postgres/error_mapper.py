import psycopg

from psycopg_pool import (
    PoolTimeout,
    PoolClosed
)

from app.core.exceptions import (
    AppError,
    ValidationError,
    ConflictError,
    PermissionDeniedError,
    ConnectionUnavailableError,
    DatabaseAuthenticationError,
    DatabaseOperationError,
    QueryTimeoutError,
    ReadOnlyViolationError,
    NotFoundError
)


class PostgresErrorMapper:

    def map(self, exception: Exception) -> AppError:

        if isinstance(
            exception,
            (PoolTimeout, PoolClosed)
        ):

            return ConnectionUnavailableError(
                "No hay conexiones PostgreSQL disponibles"
            )

        sqlstate = getattr(
            exception,
            "sqlstate",
            None
        )

        if (
            sqlstate in ("28P01", "28000")
            or "password authentication failed"
            in str(exception).lower()
        ):

            return DatabaseAuthenticationError()

        if sqlstate == "42501":

            return PermissionDeniedError(
                "Permisos PostgreSQL insuficientes"
            )

        if sqlstate == "57014":

            return QueryTimeoutError()

        if sqlstate == "25006":

            return ReadOnlyViolationError()

        if sqlstate == "3D000":

            return NotFoundError(
                "La base de datos no existe"
            )

        if sqlstate == "42P01":

            return NotFoundError(
                "La tabla o vista no existe"
            )

        if sqlstate == "42704":

            return NotFoundError(
                "El objeto solicitado no existe"
            )

        if sqlstate == "42601":

            return ValidationError(
                "Error de sintaxis SQL"
            )

        if sqlstate == "42703":

            return ValidationError(
                "La columna solicitada no existe"
            )

        if sqlstate == "42P04":

            return ConflictError(
                "La base de datos ya existe"
            )

        if sqlstate == "42710":

            return ConflictError(
                "El objeto PostgreSQL ya existe"
            )

        if sqlstate == "23505":

            return ConflictError(
                "La operación genera un registro duplicado"
            )

        if sqlstate == "23503":

            return ConflictError(
                "Violación de llave foránea"
            )

        if sqlstate == "40P01":

            return ConflictError(
                "PostgreSQL detectó un deadlock"
            )

        if sqlstate == "55P03":

            return ConflictError(
                "El recurso PostgreSQL está bloqueado"
            )

        if (
            isinstance(
                exception,
                psycopg.OperationalError
            )
            or (
                sqlstate
                and sqlstate.startswith("08")
            )
        ):

            return ConnectionUnavailableError(
                "No fue posible comunicarse con PostgreSQL"
            )

        return DatabaseOperationError(
            "PostgreSQL rechazó la operación"
        )