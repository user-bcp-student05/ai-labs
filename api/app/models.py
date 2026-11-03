from pydantic import BaseModel, ConfigDict, Field, field_validator

DEFAULT_TASK_STATUS = "TODO"
DEFAULT_TASK_PRIORITY = "MEDIUM"


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class Identity(ApiModel):
    username: str
    role: str


class TaskCreate(ApiModel):
    title: str = ""
    description: str = ""
    status: str = DEFAULT_TASK_STATUS
    priority: str = DEFAULT_TASK_PRIORITY
    owner: str | None = None

    @field_validator("title", "description", "status", "priority", "owner", mode="before")
    @classmethod
    def stringify_values(cls, value: object) -> str:
        return str(value)


class TaskResponse(ApiModel):
    id: int
    title: str
    description: str
    status: str
    owner: str
    priority: str
    created_at: str = Field(alias="createdAt")


class TaskSummary(ApiModel):
    owner: str
    total: int
    by_status: dict[str, int] = Field(alias="byStatus")
    high_priority_open: int = Field(alias="highPriorityOpen")


class RequirementResponse(ApiModel):
    owner: str
    file_name: str = Field(alias="fileName")
    stored_at: str = Field(alias="storedAt")
    size: int


class BackendHealthResponse(ApiModel):
    requested_by: str = Field(alias="requestedBy")
    status: int
    body: str
