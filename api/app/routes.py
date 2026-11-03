import os

from fastapi import APIRouter, Body, Depends, File, Query, UploadFile, status

from .models import (
    BackendHealthResponse,
    Identity,
    RequirementResponse,
    TaskCreate,
    TaskResponse,
    TaskSummary,
)
from .requirement_service import RequirementService
from .security import legacy_identity
from .service import TaskService, get_backend_health

DEFAULT_AUTH_HEALTH_URL = "http://localhost:8080/q/health"


def create_router(
    task_service: TaskService,
    requirement_service: RequirementService,
) -> APIRouter:
    router = APIRouter()

    @router.get("/api/tasks", response_model=list[TaskResponse])
    def list_tasks(
        owner: str | None = Query(default=None),
        identity: Identity = Depends(legacy_identity),
    ) -> list[TaskResponse]:
        return task_service.list_tasks(owner, identity)

    @router.post(
        "/api/tasks",
        status_code=status.HTTP_201_CREATED,
        response_model=TaskResponse,
    )
    def create_task(
        payload: TaskCreate = Body(...),
        identity: Identity = Depends(legacy_identity),
    ) -> TaskResponse:
        return task_service.create_task(payload, identity)

    @router.get("/api/summary", response_model=TaskSummary)
    def summary(
        owner: str | None = Query(default=None),
        identity: Identity = Depends(legacy_identity),
    ) -> TaskSummary:
        return task_service.summary(owner, identity)

    @router.post(
        "/api/requirements",
        status_code=status.HTTP_201_CREATED,
        response_model=RequirementResponse,
    )
    async def upload_requirement(
        file: UploadFile = File(...),
        identity: Identity = Depends(legacy_identity),
    ) -> RequirementResponse:
        return await requirement_service.save(file, identity)

    @router.get("/api/backend-health", response_model=BackendHealthResponse)
    def backend_health(
        identity: Identity = Depends(legacy_identity),
    ) -> BackendHealthResponse:
        url = os.getenv("AUTH_HEALTH_URL", DEFAULT_AUTH_HEALTH_URL)
        return get_backend_health(identity.username, url)

    return router
