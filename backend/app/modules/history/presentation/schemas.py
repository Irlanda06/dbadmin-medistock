from typing import Any

from pydantic import BaseModel

from app.modules.history.domain.entities import (
    OperationStatus
)


class OperationResponse(BaseModel):

    id: int

    serverId: int | None
    serverName: str | None
    database: str | None

    operationType: str

    targetObject: str | None
    executedBy: str

    status: OperationStatus

    errorCode: str | None
    errorMessage: str | None

    result: dict[str, Any] | None

    createdAt: str
    startedAt: str | None
    finishedAt: str | None


class HistoryPageResponse(BaseModel):

    items: list[OperationResponse]

    total: int
    limit: int
    offset: int

    hasMore: bool