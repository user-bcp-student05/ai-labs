from pathlib import Path

from fastapi import UploadFile

from .models import Identity, RequirementResponse


class RequirementService:
    def __init__(self, upload_dir: str) -> None:
        self._upload_dir = Path(upload_dir)

    async def save(self, file: UploadFile, identity: Identity) -> RequirementResponse:
        file_name = str(file.filename)
        target = self._upload_dir / file_name
        content = await file.read()
        target.write_bytes(content)
        return RequirementResponse(
            owner=identity.username,
            file_name=file_name,
            stored_at=str(target),
            size=len(content),
        )
