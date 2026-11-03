import base64
import time
from pathlib import Path

import urllib3
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.repository import TaskRepository
from app.requirement_service import RequirementService

ONE_MEBIBYTE = 1024 * 1024


def token(username: str = "student", role: str = "STUDENT") -> str:
    raw = f"{username}|{role}|{int(time.time()) + 3600}|WORKSHOP_SECRET_2026"
    return base64.b64encode(raw.encode()).decode()


def headers(username: str = "student", role: str = "STUDENT") -> dict[str, str]:
    return {"Authorization": f"Bearer {token(username, role)}"}


def test_lists_seeded_tasks(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers())
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 2
    assert [task["id"] for task in tasks] == sorted(task["id"] for task in tasks)
    assert set(tasks[0]) == {
        "id",
        "title",
        "description",
        "status",
        "owner",
        "priority",
        "createdAt",
    }


def test_characterizes_task_defaults_and_string_coercion(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": 123},
        )
    assert response.status_code == 201
    assert response.json()["title"] == "123"
    assert response.json()["description"] == ""
    assert response.json()["status"] == "TODO"
    assert response.json()["priority"] == "MEDIUM"
    assert response.json()["owner"] == "student"


def test_rejects_requested_owner_override(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        listed = client.get("/api/tasks?owner=trainer", headers=headers())
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={
                "title": "Trainer task",
                "description": "Current owner behavior",
                "owner": "trainer",
            },
        )
        summarized = client.get("/api/summary?owner=trainer", headers=headers())
        same_owner = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Student task", "owner": "student"},
        )
    assert listed.status_code == 403
    assert listed.json() == {"detail": "Forbidden"}
    assert created.status_code == 403
    assert created.json() == {"detail": "Forbidden"}
    assert summarized.status_code == 403
    assert same_owner.status_code == 201


def test_creates_task_and_summary(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Add tests", "description": "Improve coverage", "status": "TODO", "priority": "HIGH"},
        )
        summary = client.get("/api/summary", headers=headers())
    assert created.status_code == 201
    assert created.json()["owner"] == "student"
    assert summary.json()["total"] == 3


def test_summary_preserves_response_contract(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/summary", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "owner": "student",
        "total": 2,
        "byStatus": {"TODO": 1, "IN_PROGRESS": 1},
        "highPriorityOpen": 1,
    }


def test_summary_excludes_done_and_archived_high_priority_tasks(
    tmp_path: Path,
) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        for task_status in ("DONE", "ARCHIVED"):
            response = client.post(
                "/api/tasks",
                headers=headers(),
                json={
                    "title": f"Closed {task_status.lower()} task",
                    "status": task_status,
                    "priority": "HIGH",
                },
            )
            assert response.status_code == 201
        summary = client.get("/api/summary", headers=headers())
    assert summary.json()["highPriorityOpen"] == 1
    assert summary.json()["byStatus"] == {
        "TODO": 1,
        "IN_PROGRESS": 1,
        "DONE": 1,
        "ARCHIVED": 1,
    }


def test_sql_values_with_apostrophes_are_treated_as_literals(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    owner_headers = headers(username="student's")
    with TestClient(app, raise_server_exceptions=False) as client:
        created = client.post(
            "/api/tasks",
            headers=owner_headers,
            json={"title": "Owner's task", "description": "Student's note"},
        )
        listed = client.get("/api/tasks?owner=student's", headers=owner_headers)
    assert created.status_code == 201
    assert created.json()["title"] == "Owner's task"
    assert created.json()["description"] == "Student's note"
    assert listed.status_code == 200
    assert [task["title"] for task in listed.json()] == ["Owner's task"]


def test_uploads_requirement(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    content = b"Login must be accessible"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements.txt", content, "text/plain")},
        )
    assert response.status_code == 201
    assert (upload_dir / "requirements.txt").exists()
    assert response.json() == {
        "owner": "student",
        "fileName": "requirements.txt",
        "storedAt": str(upload_dir / "requirements.txt"),
        "size": len(content),
    }


def test_backend_health_returns_observed_success_shape(
    tmp_path: Path,
    monkeypatch,
) -> None:
    class StubResponse:
        status = 200
        data = b'{"status":"UP"}'

    class StubPool:
        def request(self, method: str, url: str, timeout: float) -> StubResponse:
            assert method == "GET"
            assert url == "http://localhost:8080/q/health"
            assert timeout == 3.0
            return StubResponse()

    monkeypatch.setattr(urllib3, "PoolManager", StubPool)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/backend-health", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 200,
        "body": '{"status":"UP"}',
    }


def test_backend_health_failure_does_not_expose_error_text(
    tmp_path: Path,
    monkeypatch,
) -> None:
    class StubPool:
        def request(self, method: str, url: str, timeout: float) -> None:
            raise urllib3.exceptions.HTTPError("private endpoint details")

    monkeypatch.setattr(urllib3, "PoolManager", StubPool)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/backend-health", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 0,
        "body": "Backend health check failed",
    }


def test_rejects_invalid_token(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


def test_empty_task_payload_uses_documented_defaults(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post("/api/tasks", headers=headers(), json={})
    assert response.status_code == 201
    assert response.json()["title"] == ""
    assert response.json()["description"] == ""
    assert response.json()["status"] == "TODO"
    assert response.json()["priority"] == "MEDIUM"


@pytest.mark.parametrize("path", ["/api/tasks?owner=", "/api/summary?owner="])
def test_empty_owner_query_uses_authenticated_identity(
    tmp_path: Path,
    path: str,
) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get(path, headers=headers())
    assert response.status_code == 200
    if path.startswith("/api/tasks"):
        assert response.json()[0]["owner"] == "student"
    else:
        assert response.json()["owner"] == "student"


def test_uploads_empty_file_without_extension(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements", b"", "application/octet-stream")},
        )
    assert response.status_code == 201
    assert response.json()["fileName"] == "requirements"
    assert response.json()["size"] == 0
    assert (upload_dir / "requirements").read_bytes() == b""


def test_uploads_one_megabyte_without_a_configured_size_limit(tmp_path: Path) -> None:
    content = b"x" * ONE_MEBIBYTE
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("large-file", content, "application/octet-stream")},
        )
    assert response.status_code == 201
    assert response.json()["size"] == len(content)


def test_malformed_multipart_returns_documented_bad_request(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    request_headers = {
        **headers(),
        "Content-Type": "multipart/form-data; boundary=broken",
    }
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=request_headers,
            content=b"malformed",
        )
    assert response.status_code == 400
    assert response.json() == {"detail": "There was an error parsing the body"}


def test_missing_requirement_file_returns_documented_validation_error(
    tmp_path: Path,
) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"other": (None, "value")},
        )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "file"]


@pytest.mark.parametrize(
    ("repository_method", "request_method", "path", "request_kwargs"),
    [
        ("list_tasks", "get", "/api/tasks", {}),
        ("create_task", "post", "/api/tasks", {"json": {"title": "Task"}}),
        ("summary_rows", "get", "/api/summary", {}),
    ],
)
def test_task_endpoints_return_generic_internal_server_error(
    tmp_path: Path,
    monkeypatch,
    repository_method: str,
    request_method: str,
    path: str,
    request_kwargs: dict[str, object],
) -> None:
    def fail_repository_operation(*args: object, **kwargs: object) -> None:
        raise RuntimeError("private database details")

    monkeypatch.setattr(TaskRepository, repository_method, fail_repository_operation)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app, raise_server_exceptions=False) as client:
        response = getattr(client, request_method)(
            path,
            headers=headers(),
            **request_kwargs,
        )
    _assert_internal_server_error(response)


def test_requirement_write_failure_returns_generic_internal_server_error(
    tmp_path: Path,
    monkeypatch,
) -> None:
    async def fail_requirement_save(*args: object, **kwargs: object) -> None:
        raise OSError("private file system details")

    monkeypatch.setattr(RequirementService, "save", fail_requirement_save)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements.md", b"content", "text/markdown")},
        )
    _assert_internal_server_error(response)


def test_unhandled_backend_health_error_returns_generic_internal_server_error(
    tmp_path: Path,
    monkeypatch,
) -> None:
    class StubPool:
        def request(self, method: str, url: str, timeout: float) -> None:
            raise RuntimeError("private upstream details")

    monkeypatch.setattr(urllib3, "PoolManager", StubPool)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/backend-health", headers=headers())
    _assert_internal_server_error(response)


def test_backend_health_preserves_upstream_error_status_in_success_response(
    tmp_path: Path,
    monkeypatch,
) -> None:
    class StubResponse:
        status = 503
        data = b""

    class StubPool:
        def request(self, method: str, url: str, timeout: float) -> StubResponse:
            return StubResponse()

    monkeypatch.setattr(urllib3, "PoolManager", StubPool)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/backend-health", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 503,
        "body": "",
    }


def test_backend_health_decode_failure_returns_documented_unavailable_response(
    tmp_path: Path,
    monkeypatch,
) -> None:
    class StubResponse:
        status = 200
        data = b"\xff"

    class StubPool:
        def request(self, method: str, url: str, timeout: float) -> StubResponse:
            return StubResponse()

    monkeypatch.setattr(urllib3, "PoolManager", StubPool)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/backend-health", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 0,
        "body": "Backend health check failed",
    }


@pytest.mark.parametrize(
    ("request_method", "path", "request_kwargs"),
    [
        ("get", "/api/tasks", {}),
        ("post", "/api/tasks", {"json": {}}),
        ("get", "/api/summary", {}),
        (
            "post",
            "/api/requirements",
            {"files": {"file": ("requirements.md", b"content", "text/markdown")}},
        ),
        ("get", "/api/backend-health", {}),
    ],
)
def test_all_endpoints_reject_missing_authentication(
    tmp_path: Path,
    request_method: str,
    path: str,
    request_kwargs: dict[str, object],
) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = getattr(client, request_method)(path, **request_kwargs)
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


def test_task_creation_rejects_non_object_body(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post("/api/tasks", headers=headers(), json=[])
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body"]


def _assert_internal_server_error(response) -> None:
    assert response.status_code == 500
    assert response.text == "Internal Server Error"
    assert response.headers["content-type"].startswith("text/plain")
