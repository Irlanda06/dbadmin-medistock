from typing import Protocol, Any

from app.modules.history.domain.entities import (
    OperationContext,
    OperationRecord,
    OperationStatus,
    HistoryFilter
)


class HistoryReader(Protocol):

    def find_by_id(
        self,
        operation_id: int
    ) -> OperationRecord | None:
        ...

    def find_all(
        self,
        filters: HistoryFilter
    ) -> list[OperationRecord]:
        ...

    def count(
        self,
        filters: HistoryFilter
    ) -> int:
        ...


class OperationTracker(Protocol):

    def create(
        self,
        context: OperationContext,
        status: OperationStatus
    ) -> int:
        ...

    def mark_running(
        self,
        operation_id: int
    ) -> None:
        ...

    def mark_succeeded(
        self,
        operation_id: int,
        result: dict[str, Any] | None = None
    ) -> None:
        ...

    def mark_failed(
        self,
        operation_id: int,
        error_code: str,
        error_message: str
    ) -> None:
        ...


class HistoryRepository(
    HistoryReader,
    OperationTracker,
    Protocol
):
    pass