import logging
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.models.schemas import ErrorResponse, ErrorObject, ErrorDetail

logger = logging.getLogger(__name__)


class AppException(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


async def app_exception_handler(request: Request, exc: AppException):
    logger.error(f"AppException: {exc.code} - {exc.message}")
    error_res = ErrorResponse(
        status="error", error=ErrorObject(code=exc.code, message=exc.message)
    )
    return JSONResponse(
        status_code=exc.status_code, content=error_res.dict(exclude_none=True)
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {exc.errors()}")
    details = []
    for error in exc.errors():
        field = ".".join(map(str, error.get("loc", [])))
        issue = error.get("msg", "")
        details.append(ErrorDetail(field=field, issue=issue))

    error_res = ErrorResponse(
        status="error",
        error=ErrorObject(
            code="VALIDATION_ERROR",
            message="Request validation failed.",
            details=details,
        ),
    )
    return JSONResponse(status_code=422, content=error_res.dict(exclude_none=True))


async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected Error: {str(exc)}")
    logger.error(traceback.format_exc())
    error_res = ErrorResponse(
        status="error",
        error=ErrorObject(
            code="INTERNAL_SERVER_ERROR",
            message=f"An unexpected error occurred: {str(exc)}",
        ),
    )
    return JSONResponse(status_code=500, content=error_res.dict(exclude_none=True))
