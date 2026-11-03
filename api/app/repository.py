import sqlite3
from pathlib import Path

from .models import TaskResponse

TASK_COLUMNS = "id, title, description, status, owner, priority, created_at"
CREATE_TASKS_TABLE = """
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        owner TEXT NOT NULL,
        priority TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
"""
SEED_TASKS = (
    ("Refactor login", "Separar responsabilidades en frontend", "TODO", "student", "HIGH"),
    ("Review API", "Revisar seguridad de endpoints", "IN_PROGRESS", "student", "MEDIUM"),
    ("Trainer notes", "Preparar retrospectiva", "TODO", "trainer", "LOW"),
)


class TaskRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._connection = connection

    @classmethod
    def connect(cls, db_path: str) -> "TaskRepository":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(db_path, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        repository = cls(connection)
        repository._initialize()
        return repository

    def list_tasks(self, owner: str) -> list[TaskResponse]:
        rows = self._connection.execute(
            f"SELECT {TASK_COLUMNS} FROM tasks WHERE owner = ? ORDER BY id",
            (owner,),
        ).fetchall()
        return [TaskResponse.model_validate(dict(row)) for row in rows]

    def create_task(
        self,
        title: str,
        description: str,
        status: str,
        owner: str,
        priority: str,
    ) -> TaskResponse:
        cursor = self._connection.execute(
            """
            INSERT INTO tasks(title, description, status, owner, priority, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (title, description, status, owner, priority),
        )
        self._connection.commit()
        task_id = cursor.lastrowid
        if task_id is None:
            raise RuntimeError("Inserted task has no database identifier")

        row = self._connection.execute(
            f"SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?",
            (task_id,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Inserted task could not be retrieved")
        return TaskResponse.model_validate(dict(row))

    def summary_rows(self, owner: str) -> list[tuple[str, str]]:
        rows = self._connection.execute(
            "SELECT status, priority FROM tasks WHERE owner = ?",
            (owner,),
        ).fetchall()
        return [(row["status"], row["priority"]) for row in rows]

    def close(self) -> None:
        self._connection.close()

    def _initialize(self) -> None:
        self._connection.execute(CREATE_TASKS_TABLE)
        count_row = self._connection.execute(
            "SELECT COUNT(*) AS total FROM tasks"
        ).fetchone()
        if count_row is None:
            raise RuntimeError("Task count could not be retrieved")
        total = count_row["total"]
        if total:
            return

        self._connection.executemany(
            """
            INSERT INTO tasks(title, description, status, owner, priority, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            SEED_TASKS,
        )
        self._connection.commit()
