from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from backend.core.ai import classify_urgency, generate_summary_from_context
from backend.core.errors import ai_service_exception
from backend.core.models import AnalyzeResponse, UrgencyResponse
from backend.core.report_processing import (
    derive_primary_context,
    extract_patient_name,
    extract_text_from_pdf,
    normalize_report_text,
    report_hash_from_bytes,
)
from backend.session_store import create_session

router = APIRouter(prefix="/api", tags=["analyze"])


class AnalyzeTextRequest(BaseModel):
    text: str


def _build_analyze_response(
    *,
    patient_name: str,
    report_text: str,
    primary_context: str,
    summary: str,
    urgency,
    report_hash: str,
) -> AnalyzeResponse:
    from backend.core.models import AnalysisResult as _AR

    result = _AR(
        patient_name=patient_name,
        report_text=report_text,
        primary_context=primary_context,
        summary=summary,
        urgency=urgency,
        report_hash=report_hash,
    )

    session_id = create_session(result)

    return AnalyzeResponse(
        session_id=session_id,
        patient_name=patient_name,
        summary=summary,
        urgency=UrgencyResponse(
            level=urgency.level,
            reason=urgency.reason,
            confidence=urgency.confidence,
            override_applied=urgency.override_applied,
            override_keywords=urgency.override_keywords,
        ),
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_report(file: UploadFile = File(...)):
    """
    Accept a PDF upload. Extract text, generate summary, classify urgency.
    Returns session_id for subsequent chat requests.
    """
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        report_hash = report_hash_from_bytes(pdf_bytes)
        report_text = extract_text_from_pdf(pdf_bytes)
        patient_name = extract_patient_name(report_text)
        primary_context = derive_primary_context(report_text)
        summary = generate_summary_from_context(primary_context)
        urgency = classify_urgency(summary=summary, full_report_text=report_text)
    except Exception as exc:
        raise ai_service_exception(exc, "Analysis") from exc

    return _build_analyze_response(
        patient_name=patient_name,
        report_text=report_text,
        primary_context=primary_context,
        summary=summary,
        urgency=urgency,
        report_hash=report_hash,
    )


@router.post("/analyze-text", response_model=AnalyzeResponse)
async def analyze_report_text(request: AnalyzeTextRequest):
    """
    Accept raw report text directly instead of a PDF file.
    Used by the Tampermonkey extension for PDFs already rendered in Chrome.
    """
    if not request.text or len(request.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Text is too short to analyze.")

    try:
        report_text = normalize_report_text(request.text)
        report_hash = report_hash_from_bytes(report_text.encode("utf-8"))
        patient_name = extract_patient_name(report_text)
        primary_context = derive_primary_context(report_text)
        summary = generate_summary_from_context(primary_context)
        urgency = classify_urgency(summary=summary, full_report_text=report_text)
    except Exception as exc:
        raise ai_service_exception(exc, "Analysis") from exc

    return _build_analyze_response(
        patient_name=patient_name,
        report_text=report_text,
        primary_context=primary_context,
        summary=summary,
        urgency=urgency,
        report_hash=report_hash,
    )
