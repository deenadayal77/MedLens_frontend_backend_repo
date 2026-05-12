from __future__ import annotations
from dataclasses import dataclass, field
from pydantic import BaseModel


# ---------- Internal dataclasses (used by AI layer) ----------

@dataclass
class UrgencyAssessment:
    level: str
    reason: str
    confidence: float | None = None
    override_applied: bool = False
    override_keywords: list[str] = field(default_factory=list)


@dataclass
class AnalysisResult:
    patient_name: str
    report_text: str
    primary_context: str
    summary: str
    urgency: UrgencyAssessment
    report_hash: str


@dataclass
class ChatReply:
    answer: str
    source_chunks: list[str] = field(default_factory=list)


# ---------- Pydantic response models (used by API layer) ----------

class UrgencyResponse(BaseModel):
    level: str
    reason: str
    confidence: float | None
    override_applied: bool
    override_keywords: list[str]


class AnalyzeResponse(BaseModel):
    session_id: str
    patient_name: str
    summary: str
    urgency: UrgencyResponse


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    source_chunks: list[str]


class TranslateRequest(BaseModel):
    session_id: str
    text: str
    target_language_code: str  # e.g. "hi", "te", "ta"


class TranslateResponse(BaseModel):
    translated_text: str


class TTSRequest(BaseModel):
    text: str
    language_code: str


# Error response
class ErrorResponse(BaseModel):
    detail: str
