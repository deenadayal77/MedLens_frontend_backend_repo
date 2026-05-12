"""
In-memory session store. Maps session_id -> AnalysisResult + chat_chain.
Sessions expire after 1 hour of inactivity.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

SESSION_TTL_SECONDS = 3600  # 1 hour


@dataclass
class Session:
    analysis_result: Any  # AnalysisResult
    vectorstore: Any = None
    chat_chain: Any = None
    chat_ready: bool = False
    last_accessed: float = field(default_factory=time.time)


_store: dict[str, Session] = {}


def create_session(analysis_result) -> str:
    session_id = str(uuid.uuid4())
    _store[session_id] = Session(analysis_result=analysis_result)
    return session_id


def get_session(session_id: str) -> Session | None:
    session = _store.get(session_id)
    if session is None:
        return None
    # Refresh TTL
    session.last_accessed = time.time()
    return session


def update_session(session_id: str, **kwargs) -> None:
    session = _store.get(session_id)
    if session is None:
        return
    for key, value in kwargs.items():
        setattr(session, key, value)
    session.last_accessed = time.time()


def purge_expired() -> None:
    now = time.time()
    expired = [sid for sid, s in _store.items() if now - s.last_accessed > SESSION_TTL_SECONDS]
    for sid in expired:
        del _store[sid]
