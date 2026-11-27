from typing import Annotated

from fastapi import Depends, Request

from app.config import Settings

from app.container import ApplicationContainer

from app.core.contracts import (
    PasswordEncryptor,
    PasswordDecryptor,
    HostValidator,
    ServerProbe,
    ServerConnectionControl,
    DatabaseCatalog
)

from app.modules.servers.domain.contracts import (
    ServerRepository
)

from app.modules.servers.application.profile_service import (
    ProfileService
)

from app.modules.servers.application.connection_service import (
    ConnectionService
)

from app.modules.history.domain.contracts import (
    HistoryReader,
    OperationTracker
)

from app.modules.history.application.history_service import (
    HistoryService
)


# Contenedor principal

def get_container(
    request: Request
) -> ApplicationContainer:

    return request.app.state.container


ContainerDependency = Annotated[
    ApplicationContainer,
    Depends(get_container)
]


# Configuracion

def get_settings(
    container: ContainerDependency
) -> Settings:

    return container.settings


# Seguridad

def get_password_encryptor(
    container: ContainerDependency
) -> PasswordEncryptor:

    return container.password_encryptor


def get_password_decryptor(
    container: ContainerDependency
) -> PasswordDecryptor:

    return container.password_decryptor


def get_host_validator(
    container: ContainerDependency
) -> HostValidator:

    return container.host_validator


# Infraestructura PostgreSQL

def get_server_probe(
    container: ContainerDependency
) -> ServerProbe:

    return container.server_probe


def get_server_connection_control(
    container: ContainerDependency
) -> ServerConnectionControl:

    return container.server_connection_control


def get_database_catalog(
    container: ContainerDependency
) -> DatabaseCatalog:

    return container.database_catalog


# Modulo Servers

def get_server_repository(
    container: ContainerDependency
) -> ServerRepository:

    return container.server_repository


def get_profile_service(
    container: ContainerDependency
) -> ProfileService:

    return container.profile_service


def get_connection_service(
    container: ContainerDependency
) -> ConnectionService:

    return container.connection_service


# Modulo History

def get_history_reader(
    container: ContainerDependency
) -> HistoryReader:

    return container.history_repository


def get_operation_tracker(
    container: ContainerDependency
) -> OperationTracker:

    return container.history_repository


def get_history_service(
    container: ContainerDependency
) -> HistoryService:

    return container.history_service