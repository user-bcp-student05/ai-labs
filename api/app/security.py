import logging
import os

import jwt
from fastapi import Header, HTTPException, status

from .models import Identity

TOKEN_SECRET_ENV = "API_TOKEN_SECRET"
MIN_TOKEN_SECRET_BYTES = 32
TOKEN_ALGORITHM = "HS256"
TOKEN_REQUIRED_CLAIMS = ["exp", "role", "sub"]
logger = logging.getLogger(__name__)


def verified_identity(authorization: str = Header(default="")) -> Identity:
    secret = os.getenv(TOKEN_SECRET_ENV)
    if secret is None or len(secret.encode("utf-8")) < MIN_TOKEN_SECRET_BYTES:
        logger.error(
            "%s must be configured with at least %d bytes",
            TOKEN_SECRET_ENV,
            MIN_TOKEN_SECRET_BYTES,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    try:
        authorization_parts = authorization.split()
        if (
            len(authorization_parts) != 2
            or authorization_parts[0].lower() != "bearer"
        ):
            raise jwt.InvalidTokenError("Invalid authorization scheme")

        claims = jwt.decode(
            authorization_parts[1],
            secret,
            algorithms=[TOKEN_ALGORITHM],
            options={"require": TOKEN_REQUIRED_CLAIMS},
        )
        username = claims["sub"]
        role = claims["role"]
        if not isinstance(username, str) or not isinstance(role, str):
            raise jwt.InvalidTokenError("Invalid identity claims")
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as error:
        logger.warning("Rejected an invalid bearer token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from error

    return Identity(username=username, role=role)
