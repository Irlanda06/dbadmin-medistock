from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class OperationStatus(StrEnum):

    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class OperationType(StrEnum):

    BACKUP = "BACKUP"
    RESTORE = "RESTORE"

    CREATE_ROLE = "CREATE_ROLE"
    UPDATE_ROLE = "UPDATE_ROLE"
    CHANGE_PASSWORD = "CHANGE_PASSWORD"
    ADD_ROLE_MEMBER = "ADD_ROLE_MEMBER"
    REMOVE_ROLE_MEMBER = "REMOVE_ROLE_MEMBER"

    GRANT = "GRANT"
    REVOKE = "REVOKE"

    ANALYZE = "ANALYZE"
    VACUUM = "VACUUM"

    CREATE_EXTENSION = "CREATE_EXTENSION"
    CREATE_FOREIGN_SERVER = "CREATE_FOREIGN_SERVER"
    CREATE_USER_MAPPING = "CREATE_USER_MAPPING"
    CREATE_FOREIGN_TABLE = "CREATE_FOREIGN_TABLE"
    CREATE_DISTRIBUTED_VIEW = "CREATE_DISTRIBUTED_VIEW"

    SERVER_TEST = "SERVER_TEST"
    SERVER_CONNECT = "SERVER_CONNECT"
    SERVER_DISCONNECT = "SERVER_DISCONNECT"

    SQL_QUERY = "SQL_QUERY"


@dataclass(frozen=True)
class OperationContext:

    operation_type: OperationType
    executed_by: str

    server_id: int | None = None
    server_name: str | None = None
    database_name: str | None = None
    target_object: str | None = None


@dataclass(frozen=True)
class HistoryFilter:

    server_id: int | None = None
    operation_type: OperationType | None = None
    status: OperationStatus | None = None

    limit: int = 50
    offset: int = 0


@dataclass(frozen=True)
class OperationRecord:

    id: int

    server_id: int | None
    server_name: str | None
    database_name: str | None

    operation_type: str
    target_object: str | None
    executed_by: str

    status: OperationStatus

    error_code: str | None
    error_message: str | None

    result: dict[str, Any] | None

    created_at: str
    started_at: str | None
    finished_at: str | None

    def to_public_dict(self) -> dict:

        return {
            "id": self.id,
            "serverId": self.server_id,
            "serverName": self.server_name,
            "database": self.database_name,
            "operationType": self.operation_type,
            "targetObject": self.target_object,
            "executedBy": self.executed_by,
            "status": self.status.value,
            "errorCode": self.error_code,
            "errorMessage": self.error_message,
            "result": self.result,
            "createdAt": self.created_at,
            "startedAt": self.started_at,
            "finishedAt": self.finished_at
        }