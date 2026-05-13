from __future__ import annotations

import re

from fastapi import HTTPException


def _retry_after_seconds(message: str) -> str | None:
    match = re.search(r"retry(?:Delay| in)?[':\s]+([0-9.]+)s", message, re.IGNORECASE)
    if match:
        seconds = float(match.group(1))
        return str(max(1, round(seconds)))
    return None


def ai_service_exception(exc: Exception, action: str) -> HTTPException:
    """Map provider failures to user-safe API errors."""
    message = str(exc)
    lower_message = message.lower()

    if (
        "resource_exhausted" in lower_message
        or "quota exceeded" in lower_message
        or "429" in lower_message
    ):
        retry_after = _retry_after_seconds(message)
        headers = {"Retry-After": retry_after} if retry_after else None
        retry_text = f" Please try again in about {retry_after} seconds." if retry_after else ""
        return HTTPException(
            status_code=429,
            detail=(
                f"{action} could not run because the AI usage quota has been reached."
                f"{retry_text} If this keeps happening, update the Gemini billing/quota "
                "or switch to another API key."
            ),
            headers=headers,
        )

    if "api key" in lower_message or "permission" in lower_message or "unauth" in lower_message:
        return HTTPException(
            status_code=503,
            detail=(
                f"{action} could not run because the AI service is not configured correctly. "
                "Please check the backend API key."
            ),
        )

    return HTTPException(
        status_code=500,
        detail=f"{action} failed. Please try again with a clear PDF, or try again later.",
    )
