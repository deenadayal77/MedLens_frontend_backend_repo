from __future__ import annotations

from dataclasses import dataclass, field


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

