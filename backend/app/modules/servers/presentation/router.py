from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Path,
    status
)

from app.core.responses import (
    success,
    SuccessResponse
)

from app.dependencies import (
    get_profile_service,
    get_connection_service
)

from app.modules.servers.application.profile_service import (
    ProfileService
)

from app.modules.servers.application.connection_service import (
    ConnectionService
)

from app.modules.servers.presentation.schemas import (
    ConnectionTestRequest,
    ServerProfileRequest,
    ServerProfileResponse
)


router = APIRouter(
    prefix="/servers",
    tags=["Servers"]
)


ProfileDependency = Annotated[
    ProfileService,
    Depends(get_profile_service)
]

ConnectionDependency = Annotated[
    ConnectionService,
    Depends(get_connection_service)
]

ServerId = Annotated[
    int,
    Path(ge=1)
]


# E01 - Listar servidores

@router.get(
    "",
    response_model=SuccessResponse[list[ServerProfileResponse]]
)
def list_servers(
    service: ProfileDependency
):

    profiles = service.list_servers()

    return success([
        profile.to_public_dict()
        for profile in profiles
    ])


# E03 - Registrar servidor

@router.post(
    "",
    response_model=SuccessResponse[ServerProfileResponse],
    status_code=status.HTTP_201_CREATED
)
def create_server(
    request: ServerProfileRequest,
    service: ProfileDependency
):

    profile = service.create_server(
        request.to_command()
    )

    return success(
        profile.to_public_dict()
    )


# E06 - Probar conexión sin registrar servidor

@router.post(
    "/test",
    response_model=SuccessResponse[dict]
)
def test_credentials(
    request: ConnectionTestRequest,
    service: ConnectionDependency
):

    return success(
        service.test_credentials(
            request.to_credentials()
        )
    )


# E02 - Consultar perfil

@router.get(
    "/{server_id}",
    response_model=SuccessResponse[ServerProfileResponse]
)
def get_server(
    server_id: ServerId,
    service: ProfileDependency
):

    profile = service.get_server(
        server_id
    )

    return success(
        profile.to_public_dict()
    )


# E04 - Actualizar perfil

@router.put(
    "/{server_id}",
    response_model=SuccessResponse[ServerProfileResponse]
)
def update_server(
    server_id: ServerId,
    request: ServerProfileRequest,
    service: ProfileDependency
):

    profile = service.update_server(
        server_id,
        request.to_command()
    )

    return success(
        profile.to_public_dict()
    )


# E05 - Eliminar perfil

@router.delete(
    "/{server_id}",
    response_model=SuccessResponse[dict]
)
def delete_server(
    server_id: ServerId,
    service: ProfileDependency
):

    service.delete_server(server_id)

    return success({
        "serverId": server_id,
        "deleted": True
    })


# E07 - Probar servidor registrado

@router.post(
    "/{server_id}/test",
    response_model=SuccessResponse[dict]
)
def test_server(
    server_id: ServerId,
    service: ConnectionDependency
):

    return success(
        service.test_server(server_id)
    )


# E08 - Conectar servidor

@router.post(
    "/{server_id}/connect",
    response_model=SuccessResponse[dict]
)
def connect_server(
    server_id: ServerId,
    service: ConnectionDependency
):

    return success(
        service.connect(server_id)
    )


# E09 - Desconectar servidor

@router.post(
    "/{server_id}/disconnect",
    response_model=SuccessResponse[dict]
)
def disconnect_server(
    server_id: ServerId,
    service: ConnectionDependency
):

    return success(
        service.disconnect(server_id)
    )


# E10 - Consultar estado

@router.get(
    "/{server_id}/status",
    response_model=SuccessResponse[dict]
)
def get_server_status(
    server_id: ServerId,
    service: ConnectionDependency
):

    return success(
        service.get_status(server_id)
    )


# E11 - Consultar información PostgreSQL

@router.get(
    "/{server_id}/info",
    response_model=SuccessResponse[dict]
)
def get_server_info(
    server_id: ServerId,
    service: ConnectionDependency
):

    return success(
        service.get_info(server_id)
    )


# E12 - Listar bases de datos

@router.get(
    "/{server_id}/databases",
    response_model=SuccessResponse[list[dict]]
)
def list_databases(
    server_id: ServerId,
    service: ConnectionDependency
):

    return success(
        service.list_databases(server_id)
    )