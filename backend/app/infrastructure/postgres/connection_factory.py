from contextlib import contextmanager
from typing import Iterator

import psycopg

from psycopg.rows import dict_row

from app.core.contracts import (
    HostValidator,
    PostgresCredentials
)

from app.core.exceptions import ValidationError

from app.core.validators import (
    validate_identifier,
    validate_port
)

from app.infrastructure.postgres.error_mapper import (
    PostgresErrorMapper
)


class PostgresConnectionFactory:

    def __init__(
        self,
        host_validator: HostValidator,
        error_mapper: PostgresErrorMapper,
        connect_timeout: int,
        query_timeout_ms: int
    ):

        self._host_validator = host_validator
        self._error_mapper = error_mapper
        self._connect_timeout = connect_timeout
        self._query_timeout_ms = query_timeout_ms

    def build_parameters(
        self,
        credentials: PostgresCredentials
    ) -> dict:

        address = self._host_validator.resolve(
            credentials.host
        )

        validate_port(credentials.port)

        validate_identifier(
            credentials.database
        )

        validate_identifier(
            credentials.username
        )

        return {

            "host": credentials.host,

            "hostaddr": address,

            "port": credentials.port,

            "dbname": credentials.database,

            "user": credentials.username,

            "password": credentials.password,

            "connect_timeout": self._connect_timeout,

            "application_name": "DBAdmin",

            "row_factory": dict_row
        }

    @contextmanager
    def connection(
        self,
        credentials: PostgresCredentials,
        autocommit: bool = False,
        readonly: bool = False,
        limited: bool = False
    ) -> Iterator[psycopg.Connection]:

        if readonly and autocommit:

            raise ValidationError(
                "El modo de lectura requiere una transacción"
            )

        parameters = self.build_parameters(
            credentials
        )

        if readonly or limited:

            parameters["options"] = (
                f"-c statement_timeout={self._query_timeout_ms}"
            )

        try:

            with psycopg.connect(
                **parameters,
                autocommit=autocommit
            ) as connection:

                if readonly:

                    connection.read_only = True

                yield connection

        except psycopg.Error as exception:

            raise self._error_mapper.map(
                exception
            ) from None