import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware
)

from app.config import Settings

from app.container import build_container

from app.core.responses import (
    success,
    SuccessResponse
)

from app.core.handlers import (
    register_exception_handlers
)

from app.modules.servers.presentation.router import (
    router as servers_router
)

from app.modules.history.presentation.router import (
    router as history_router
)

from app.modules._shared.routers import (
    FEATURE_ROUTERS
)

from app.modules._shared.composition import (
    recover_interrupted
)


logger = logging.getLogger(
    "uvicorn.error"
)


def create_app(
    settings: Settings | None = None
) -> FastAPI:

    configuration = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):

        container = build_container(
            configuration
        )

        try:

            # Inicializar SQLite

            container.migration_runner.migrate()

            # Recuperar operaciones interrumpidas

            recover_interrupted(
                container.sqlite_database
            )

            app.state.container = container

            logger.info(
                "SQLite inicializado correctamente"
            )

            logger.info(
                "Migraciones verificadas correctamente"
            )

            logger.info(
                "Infraestructura PostgreSQL inicializada"
            )

            logger.info(
                "Modulo Servers inicializado"
            )

            logger.info(
                "Modulo History inicializado"
            )

            logger.info(
                "Modulo Explorer inicializado"
            )

            logger.info(
                "Modulo Backups inicializado"
            )

            logger.info(
                "Modulo Restores inicializado"
            )

            logger.info(
                "Modulo Roles inicializado"
            )

            logger.info(
                "Modulo Privileges inicializado"
            )

            logger.info(
                "Modulo Maintenance inicializado"
            )

            logger.info(
                "Modulo Monitoring inicializado"
            )

            logger.info(
                "Modulo Distributed inicializado"
            )

            logger.info(
                "DBAdmin iniciado correctamente"
            )

            yield

        finally:

            container.resource_manager.close_all()

            logger.info(
                "Conexiones PostgreSQL cerradas"
            )

            logger.info(
                "DBAdmin detenido correctamente"
            )

    # Instancia principal

    app = FastAPI(

        title=configuration.APP_NAME,

        version=configuration.APP_VERSION,

        description=(
            "Panel de administracion de PostgreSQL"
        ),

        lifespan=lifespan
    )

    app.state.settings = configuration

    # Configuracion CORS

    app.add_middleware(

        CORSMiddleware,

        allow_origins=[
            configuration.FRONTEND_URL
        ],

        allow_credentials=False,

        allow_methods=[
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
        ],

        allow_headers=[
            "Content-Type",
            "Authorization"
        ]
    )

    # Manejo global de excepciones

    register_exception_handlers(app)

    # Endpoint del sistema

    @app.get(
        "/",
        response_model=SuccessResponse[dict],
        tags=["System"]
    )
    def root():

        return success({

            "application": configuration.APP_NAME,

            "version": configuration.APP_VERSION,

            "status": "ONLINE"
        })

    # Registro centralizado de modulos

    routers = [

        servers_router,

        history_router,

        *FEATURE_ROUTERS
    ]

    for router in routers:

        app.include_router(
            router,
            prefix=configuration.API_PREFIX
        )

    return app


app = create_app()