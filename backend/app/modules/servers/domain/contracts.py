from typing import Protocol

from app.modules.servers.domain.entities import (
    ProfileData,
    ServerProfile
)


class ServerRepository(Protocol):

    def find_all(self) -> list[ServerProfile]:
        ...

    def find_by_id(
        self,
        server_id: int
    ) -> ServerProfile | None:
        ...

    def create(
        self,
        data: ProfileData
    ) -> ServerProfile:
        ...

    def update(
        self,
        server_id: int,
        data: ProfileData
    ) -> ServerProfile:
        ...

    def delete(
        self,
        server_id: int
    ) -> None:
        ...