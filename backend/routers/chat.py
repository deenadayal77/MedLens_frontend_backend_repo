from __future__ import annotations

from fastapi import APIRouter, HTTPException
from deep_translator import GoogleTranslator
from gtts import gTTS
from io import BytesIO
from fastapi.responses import StreamingResponse

from backend.core.ai import (
    answer_question_from_context,
    retrieve_relevant_chunks,
)
from backend.core.errors import ai_service_exception
from backend.core.models import (
    ChatRequest, ChatResponse,
    TranslateRequest, TranslateResponse,
    TTSRequest,
)
from backend.session_store import get_session

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a follow-up question about the report."""
    try:
        session = get_session(request.session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired.")

        source_chunks = retrieve_relevant_chunks(
            report_text=session.analysis_result.primary_context,
            question=request.message,
        )
        reply = answer_question_from_context(
            question=request.message,
            source_chunks=source_chunks,
            summary=session.analysis_result.summary,
            urgency=session.analysis_result.urgency,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise ai_service_exception(exc, "Chat") from exc

    return ChatResponse(answer=reply.answer, source_chunks=reply.source_chunks)


@router.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """Translate a summary text into a target language."""
    try:
        translated = GoogleTranslator(
            source="auto",
            target=request.target_language_code,
        ).translate(request.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Translation failed: {exc}")
    return TranslateResponse(translated_text=translated)


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to MP3 audio and stream it back."""
    try:
        tts = gTTS(text=request.text, lang=request.language_code)
        buffer = BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS failed: {exc}")
    return StreamingResponse(buffer, media_type="audio/mpeg")
