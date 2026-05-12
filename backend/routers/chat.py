from __future__ import annotations

from fastapi import APIRouter, HTTPException
from deep_translator import GoogleTranslator
from gtts import gTTS
from io import BytesIO
from fastapi.responses import StreamingResponse

from backend.core.ai import build_vectorstore, build_chat_chain, chatbot_response
from backend.core.models import (
    ChatRequest, ChatResponse,
    TranslateRequest, TranslateResponse,
    TTSRequest,
)
from backend.session_store import get_session, update_session

router = APIRouter(prefix="/api", tags=["chat"])


def _ensure_chat_ready(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    if session.chat_ready and session.chat_chain is not None:
        return session

    vectorstore = build_vectorstore(
        report_text=session.analysis_result.primary_context,
        report_hash=session.analysis_result.report_hash,
    )
    chat_chain = build_chat_chain(
        vectorstore=vectorstore,
        urgency=session.analysis_result.urgency,
    )
    update_session(session_id, vectorstore=vectorstore, chat_chain=chat_chain, chat_ready=True)
    return get_session(session_id)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a follow-up question about the report."""
    try:
        session = _ensure_chat_ready(request.session_id)
        reply = chatbot_response(session.chat_chain, request.message)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}")

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
