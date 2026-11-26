from dataclasses import dataclass, field
from typing import Protocol, Any


class PasswordEncryptor(Protocol):

    def encrypt(self, value: str) -> str:
        ...


class PasswordDecryptor(Protocol):

    def decrypt(self, value: str) -> str:
        ...


class HostValidator(Protocol):

    def resolve(self, host: str) -> str:
        ...


class MigrationRunner(Protocol):

    def migrate(self) -> None:
        ...


class ResourceManager(Protocol):

    def close_all(self) -> None:
        ...


@dataclass(frozen=True)
class PostgresCredentials:

    host: str
    port: int
    database: str
    username: str

    password: str = field(repr=False)


class ServerProbe(Protocol):

    def test(
        self,
        credentials: PostgresCredentials
    ) -> dict[str, Any]:
        ...


class ServerConnectionControl(Protocol):

    def connect(
        self,
        server_id: int,
        credentials: PostgresCredentials
    ) -> dict[str, Any]:
        ...

    def disconnect(
        self,
        server_id: int
    ) -> None:
        ...

    def is_connected(
        self,
        server_id: int
    ) -> bool:
        ...


class DatabaseCatalog(Protocol):

    def list_databases(
        self,
        server_id: int,
        credentials: PostgresCredentials
    ) -> list[dict[str, Any]]:
        ...