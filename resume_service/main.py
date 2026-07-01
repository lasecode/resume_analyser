import logging
import os
import uuid
import contextvars
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

import config
from routes import router as api_router
from services import init_parser

# Context variable for request tracing
request_id_ctx_var = contextvars.ContextVar("request_id", default=None)


class StructuredFormatter(logging.Formatter):
    """Logs messages with the current request ID context if available."""
    def format(self, record):
        req_id = request_id_ctx_var.get()
        record.request_id = req_id if req_id else "N/A"
        return super().format(record)


# Configure structured logging
handler = logging.StreamHandler()
handler.setFormatter(
    StructuredFormatter("%(asctime)s [%(levelname)s] [ReqID: %(request_id)s] %(name)s: %(message)s")
)
logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to inject request IDs into logs and responses."""
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx_var.set(request_id)
        try:
            response: Response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_ctx_var.reset(token)


class TimeoutMiddleware(BaseHTTPMiddleware):
    """Enforces a global processing timeout for requests to prevent worker hangs."""
    def __init__(self, app, timeout: float = 60.0):
        super().__init__(app)
        self.timeout = timeout

    async def dispatch(self, request: Request, call_next):
        try:
            return await asyncio.wait_for(call_next(request), timeout=self.timeout)
        except asyncio.TimeoutError:
            logger.error("Request execution exceeded timeout limit.")
            return JSONResponse(
                status_code=504,
                content={"detail": "Request processing timed out."}
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize singleton ResumeParser during startup
    init_parser()
    yield
    # Shutdown cleaning can go here if needed


app = FastAPI(
    title="Ognite Resume Parser API",
    version="1.0.0",
    description="Extracts structured data (skills, experience, education, etc.) from resumes.",
    lifespan=lifespan,
)

# Enforce secure CORS setup
# When allow_origins contains "*", allow_credentials must be False.
allow_all_origins = "*" in config.CORS_ORIGINS
allow_credentials = not allow_all_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register request tracking and timeout middlewares
app.add_middleware(RequestIDMiddleware)
app.add_middleware(TimeoutMiddleware, timeout=config.REQUEST_TIMEOUT)

# Register API Router
app.include_router(api_router)

# Mount static files *after* defining other endpoints so they don't get intercepted
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Use HF-assigned port or port from environment
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT)
