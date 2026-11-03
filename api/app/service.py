import logging

import urllib3
from fastapi import HTTPException, status

from .models import (
    BackendHealthResponse,
    Identity,
    TaskCreate,
    TaskResponse,
    TaskSummary,
)
from .repository import TaskRepository

TERMINAL_STATUSES = frozenset({"DONE", "ARCHIVED"})
HIGH_PRIORITY = "HIGH"
BACKEND_HEALTH_TIMEOUT_SECONDS = 3.0
BACKEND_HEALTH_FAILURE_MESSAGE = "Backend health check failed"
BACKEND_HEALTH_UNAVAILABLE_STATUS = 0
logger = logging.getLogger(__name__)


class TaskService:
    def __init__(self, repository: TaskRepository) -> None:
        self._repository = repository

    def list_tasks(
        self,
        requested_owner: str | None,
        identity: Identity,
    ) -> list[TaskResponse]:
        owner = requested_owner or identity.username
        self._authorize_owner(owner, identity)
        return self._repository.list_tasks(identity.username)

    def create_task(self, payload: TaskCreate, identity: Identity) -> TaskResponse:
        owner = identity.username
        if "owner" in payload.model_fields_set:
            owner = payload.owner
        self._authorize_owner(owner, identity)
        return self._repository.create_task(
            title=payload.title,
            description=payload.description,
            status=payload.status,
            owner=identity.username,
            priority=payload.priority,
        )

    def summary(self, requested_owner: str | None, identity: Identity) -> TaskSummary:
        owner = requested_owner or identity.username
        self._authorize_owner(owner, identity)
        status_counts: dict[str, int] = {}
        high_priority_open = 0

        for status, priority in self._repository.summary_rows(identity.username):
            status_counts[status] = status_counts.get(status, 0) + 1
            if priority == HIGH_PRIORITY and status not in TERMINAL_STATUSES:
                high_priority_open += 1

        return TaskSummary(
            owner=identity.username,
            total=sum(status_counts.values()),
            by_status=status_counts,
            high_priority_open=high_priority_open,
        )

    @staticmethod
    def _authorize_owner(requested_owner: str | None, identity: Identity) -> None:
        if requested_owner != identity.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )


def get_backend_health(requested_by: str, url: str) -> BackendHealthResponse:
    try:
        response = urllib3.PoolManager().request(
            "GET",
            url,
            timeout=BACKEND_HEALTH_TIMEOUT_SECONDS,
        )
        body = response.data.decode("utf-8")
    except (urllib3.exceptions.HTTPError, UnicodeDecodeError):
        logger.exception("Backend health request failed")
        return BackendHealthResponse(
            requested_by=requested_by,
            status=BACKEND_HEALTH_UNAVAILABLE_STATUS,
            body=BACKEND_HEALTH_FAILURE_MESSAGE,
        )

    return BackendHealthResponse(
        requested_by=requested_by,
        status=response.status,
        body=body,
    )
