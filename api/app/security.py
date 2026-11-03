import base64
import binascii
import logging
import time

from fastapi import Header, HTTPException, status

from .models import Identity

LEGACY_SECRET = "WORKSHOP_SECRET_2026"
logger = logging.getLogger(__name__)


def legacy_identity(authorization: str = Header(default="")) -> Identity:
    try:
        token = authorization.replace("Bearer ", "")
        decoded = base64.b64decode(token).decode("utf-8")
        parts = decoded.split("|")
        if len(parts) != 4 or parts[3] != LEGACY_SECRET or int(parts[2]) < int(time.time()):
            raise ValueError("invalid token")
    except (binascii.Error, UnicodeDecodeError, ValueError) as error:
        logger.warning("Rejected an invalid legacy token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from error

    return Identity(username=parts[0], role=parts[1])
