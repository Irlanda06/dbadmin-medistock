from fastapi import FastAPI, Request

from fastapi.exceptions import (
    RequestValidationError
)

from fastapi.responses import JSONResponse

from starlette.exceptions import (
    HTTPException as StarletteHTTPException
)

from app.core.exceptions import AppError
from app.core.responses import error


ERROR_STATUS = {

    "VALIDATION_ERROR": 400,
    "DATABASE_ERROR": 400,

    "DB_AUTH_FAILED": 401,

    "INSUFFICIENT_PRIVILEGES": 403,
    "READ_ONLY_VIOLATION": 403,

    "NOT_FOUND": 404,

    "CONFLICT": 409,
    "PROFILE_EXISTS": 409,
    "DATABASE_EXISTS": 409,
    "READER_NOT_CONFIGURED": 409,

    "STORAGE_ERROR": 500,
    "NODE_UNAVAILABLE": 503,
    "QUERY_TIMEOUT": 504
}


async def app_error_handler(
    request: Request,
    exc: AppError
):

    status_code = ERROR_STATUS.get(
        exc.code,
        500
    )

    response = error(
        exc.code,
        exc.message
    )

    return JSONResponse(
        status_code=status_code,
        content=response.model_dump()
    )


async def validation_error_handler(
    request: Request,
    exc: RequestValidationError
):

    details = [

        {
            "field": ".".join(
                str(item)
                for item in detail["loc"]
            ),

            "type": detail["type"]
        }

        for detail in exc.errors()
    ]

    return JSONResponse(
        status_code=400,
        content={
            "ok": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Datos de entrada inválidos",
                "details": details
            }
        }
    )


async def http_error_handler(
    request: Request,
    exc: StarletteHTTPException
):

    messages = {
        404: "Recurso no encontrado",
        405: "Método HTTP no permitido"
    }

    response = error(
        f"HTTP_{exc.status_code}",
        messages.get(
            exc.status_code,
            "Solicitud HTTP rechazada"
        )
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=response.model_dump(),
        headers=exc.headers
    )


async def unexpected_error_handler(
    request: Request,
    exc: Exception
):

    response = error(
        "INTERNAL_ERROR",
        "Ocurrió un error interno en el servidor"
    )

    return JSONResponse(
        status_code=500,
        content=response.model_dump()
    )


def register_exception_handlers(
    app: FastAPI
) -> None:

    app.add_exception_handler(
        AppError,
        app_error_handler
    )

    app.add_exception_handler(
        RequestValidationError,
        validation_error_handler
    )

    app.add_exception_handler(
        StarletteHTTPException,
        http_error_handler
    )

    app.add_exception_handler(
        Exception,
        unexpected_error_handler
    )