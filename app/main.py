import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.api.endpoints import router as api_router
from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    general_exception_handler,
)
from app.models.database import engine, Base

import logging

# Set up logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KataAI Customer Service Agent API",
    description="RAG-powered Telco Customer Service Assistant",
    version="1.0.0",
)

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Tracing Middleware
class TraceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
        request.state.trace_id = trace_id
        logger.info(f"[{trace_id}] Received {request.method} {request.url.path}")
        response = await call_next(request)
        logger.info(f"[{trace_id}] Responded with {response.status_code}")
        response.headers["X-Trace-Id"] = trace_id
        return response


app.add_middleware(TraceMiddleware)

# Routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "success", "message": "KataAI Backend is running."}
