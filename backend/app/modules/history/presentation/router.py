from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Path,
    Query
)

from app.core.responses import (
    SuccessResponse,
    success
)

from app.dependencies import (
    get_history_service
)

from app.modules.history.application.history_service import (
    HistoryService
)

from app.modules.history.domain.entities import (
    HistoryFilter,
    OperationType,
    OperationStatus
)

from app.modules.history.presentation.schemas import (
    OperationResponse,
    HistoryPageResponse
)


router = APIRouter(
    prefix="/history",
    tags=["History"]
)


HistoryDependency = Annotated[
    HistoryService,
    Depends(get_history_service)
]


OperationId = Annotated[
    int,
    Path(ge=1)
]


# E60 - Listar historial

@router.get(
    "",
    response_model=SuccessResponse[HistoryPageResponse]
)
def list_history(

    service: HistoryDependency,

    server_id: Annotated[
        int | None,
        Query(alias="serverId", ge=1)
    ] = None,

    operation_type: Annotated[
        OperationType | None,
        Query(alias="operationType")
    ] = None,

    operation_status: Annotated[
        OperationStatus | None,
        Query(alias="status")
    ] = None,

    limit: Annotated[
        int,
        Query(ge=1, le=200)
    ] = 50,

    offset: Annotated[
        int,
        Query(ge=0)
    ] = 0

):

    filters = HistoryFilter(
        server_id=server_id,
        operation_type=operation_type,
        status=operation_status,
        limit=limit,
        offset=offset
    )

    return success(
        service.list_operations(filters)
    )


# E61 - Consultar detalle de una operación

@router.get(
    "/{operation_id}",
    response_model=SuccessResponse[OperationResponse]
)
def get_operation(

    operation_id: OperationId,

    service: HistoryDependency

):

    operation = service.get_operation(
        operation_id
    )

    return success(
        operation.to_public_dict()
    )