from typing import Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):

    ok: bool = True
    data: T


class ErrorDetail(BaseModel):

    code: str
    message: str


class ErrorResponse(BaseModel):

    ok: bool = False
    error: ErrorDetail


def success(data: T) -> SuccessResponse[T]:

    return SuccessResponse[T](
        data=data
    )


def error(
    code: str,
    message: str
) -> ErrorResponse:

    return ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message
        )
    )