import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .repository import TaskRepository
from .requirement_service import RequirementService
from .routes import create_router
from .service import TaskService

DEFAULT_DB_PATH = "./data/workshop.db"
DEFAULT_UPLOAD_DIR = "./uploads"


def create_app(db_path: str | None = None, upload_dir: str | None = None) -> FastAPI:
    selected_db = db_path or os.getenv("WORKSHOP_DB_PATH", DEFAULT_DB_PATH)
    selected_uploads = upload_dir or os.getenv(
        "WORKSHOP_UPLOAD_DIR",
        DEFAULT_UPLOAD_DIR,
    )
    Path(selected_uploads).mkdir(parents=True, exist_ok=True)
    repository = TaskRepository.connect(selected_db)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        try:
            yield
        finally:
            repository.close()

    app = FastAPI(
        title="Workshop Requirements API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(
        create_router(
            TaskService(repository),
            RequirementService(selected_uploads),
        )
    )
    return app


app = create_app()
