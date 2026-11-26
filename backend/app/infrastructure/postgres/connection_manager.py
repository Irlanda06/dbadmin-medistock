from contextlib import contextmanager
from dataclasses import dataclass, field
from threading import RLock
from typing import Iterator

import psycopg

from psycopg_pool import (
    ConnectionPool,
    PoolTimeout,
    PoolClosed
)

from app.core.contracts import (
    PostgresCredentials
)

from app.infrastructure.postgres.connection_factory import (
    PostgresConnectionFactory
)

from app.infrastructure.postgres.error_mapper import (
    PostgresErrorMapper
)


@dataclass
class PoolEntry:

    credentials: PostgresCredentials = field(
        repr=False
    )

    pool: ConnectionPool


class PostgresConnectionManager:

    def __init__(
        self,
        factory: PostgresConnectionFactory,
        error_mapper: PostgresErrorMapper,
        min_size: int,
        max_size: int,
        timeout: int
    ):

        self._factory = factory
        self._error_mapper = error_mapper

        self._min_size = min_size
        self._max_size = max_size
        self._timeout = timeout

        self._pools: dict[int, PoolEntry] = {}

        self._lock = RLock()

    def connect(
        self,
        server_id: int,
        credentials: PostgresCredentials
    ) -> None:

        parameters = self._factory.build_parameters(
            credentials
        )

        pool = ConnectionPool(

            kwargs=parameters,

            min_size=self._min_size,

            max_size=self._max_size,

            timeout=self._timeout,

            open=False,

            check=ConnectionPool.check_connection
        )

        try:

            pool.open(
                wait=True,
                timeout=self._timeout
            )

        except (
            psycopg.Error,
            PoolTimeout,
            PoolClosed
        ) as exception:

            pool.close()

            raise self._error_mapper.map(
                exception
            ) from None

        except BaseException:

            pool.close()
            raise

        entry = PoolEntry(
            credentials=credentials,
            pool=pool
        )

        with self._lock:

            previous = self._pools.get(
                server_id
            )

            self._pools[server_id] = entry

        if previous is not None:

            previous.pool.close()

    def disconnect(
        self,
        server_id: int
    ) -> None:

        with self._lock:

            entry = self._pools.pop(
                server_id,
                None
            )

        if entry is not None:

            entry.pool.close()

    def is_connected(
        self,
        server_id: int
    ) -> bool:

        with self._lock:

            entry = self._pools.get(
                server_id
            )

            return (
                entry is not None
                and not entry.pool.closed
            )

    @contextmanager
    def connection(
        self,
        credentials: PostgresCredentials,
        server_id: int | None = None,
        autocommit: bool = False,
        readonly: bool = False,
        limited: bool = False
    ) -> Iterator[psycopg.Connection]:

        entry = None

        if (
            server_id is not None
            and not autocommit
            and not readonly
            and not limited
        ):

            with self._lock:

                candidate = self._pools.get(
                    server_id
                )

                if (
                    candidate is not None
                    and candidate.credentials == credentials
                    and not candidate.pool.closed
                ):

                    entry = candidate

        if entry is not None:

            try:

                with entry.pool.connection() as connection:

                    yield connection

            except (
                psycopg.Error,
                PoolTimeout,
                PoolClosed
            ) as exception:

                raise self._error_mapper.map(
                    exception
                ) from None

            return

        with self._factory.connection(

            credentials=credentials,

            autocommit=autocommit,

            readonly=readonly,

            limited=limited

        ) as connection:

            yield connection

    def close_all(self) -> None:

        with self._lock:

            entries = list(
                self._pools.values()
            )

            self._pools.clear()

        for entry in entries:

            entry.pool.close()