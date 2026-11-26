import sqlite3

from pathlib import Path
from contextlib import contextmanager
from typing import Iterator

from app.core.exceptions import StorageError


class SQLiteDatabase:

    def __init__(
        self,
        database_path: Path,
        timeout: int = 5
    ):

        self._database_path = database_path
        self._timeout = timeout

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:

        try:

            connection = sqlite3.connect(
                self._database_path,
                timeout=self._timeout
            )

        except sqlite3.Error:

            raise StorageError() from None

        connection.row_factory = sqlite3.Row

        try:

            connection.execute(
                "PRAGMA foreign_keys = ON"
            )

            connection.execute(
                "PRAGMA busy_timeout = 5000"
            )

            yield connection

            connection.commit()

        except sqlite3.IntegrityError:

            connection.rollback()
            raise

        except sqlite3.Error:

            connection.rollback()

            raise StorageError() from None

        except BaseException:

            connection.rollback()
            raise

        finally:

            connection.close()