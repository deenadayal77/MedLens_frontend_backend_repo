from __future__ import annotations

from io import BytesIO

import streamlit as st
from deep_translator import GoogleTranslator
from gtts import gTTS

from medlens_app.config import DISCLAIMER_TEXT, SUGGESTED_QUESTIONS, URGENCY_STYLES
from medlens_app.models import UrgencyAssessment

LANGUAGE_MAP = {
    "English": "en",
    "Hindi": "hi",
    "Telugu": "te",
    "Tamil": "ta",
    "Kannada": "kn",
    "Malayalam": "ml",
    "Bengali": "bn",
}


def apply_theme() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background:
                radial-gradient(circle at top left, rgba(45, 125, 154, 0.12), transparent 30%),
                linear-gradient(180deg, #f7fbfc 0%, #eef4f6 100%);
        }
        .hero-card, .medlens-card {
            border-radius: 18px;
            padding: 1.2rem 1.3rem;
            background: rgba(255, 255, 255, 0.88);
            border: 1px solid rgba(26, 79, 92, 0.12);
            box-shadow: 0 14px 40px rgba(16, 24, 40, 0.08);
            backdrop-filter: blur(10px);
        }
        .hero-card h1 {
            margin: 0;
            font-size: 2rem;
            color: #11343d;
        }
        .hero-card p {
            margin: 0.4rem 0 0;
            color: #35535b;
        }
        .urgency-bar {
            width: 100%;
            height: 10px;
            border-radius: 999px;
            background: rgba(16, 24, 40, 0.08);
            overflow: hidden;
            margin-top: 0.85rem;
        }
        .urgency-fill {
            height: 100%;
            border-radius: 999px;
        }
        .source-chip {
            background: #edf7fa;
            border: 1px solid #d4ebf0;
            border-radius: 12px;
            padding: 0.75rem 0.85rem;
            margin-bottom: 0.55rem;
            color: #22434a;
            font-size: 0.92rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_header() -> None:
    st.markdown(
        """
        <div class="hero-card">
            <h1>MedLens AI Medical Assistant</h1>
            <p>Upload a report, review a grounded summary, and ask calm follow-up questions based only on your report context.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_summary(summary: str) -> None:
    st.markdown("### 📄 Summary")
    with st.container(border=True):
        st.markdown(summary)


def render_urgency_card(urgency: UrgencyAssessment) -> None:
    style = URGENCY_STYLES[urgency.level]
    confidence = (
        f"<div style='margin-top:0.55rem;color:#35535b;font-size:0.92rem;'>"
        f"Confidence: {int(urgency.confidence * 100)}%</div>"
        if urgency.confidence is not None
        else ""
    )
    override_note = (
        "<div style='margin-top:0.55rem;color:#7a271a;font-size:0.92rem;'>"
        f"Safety override applied due to keywords: {', '.join(urgency.override_keywords)}</div>"
        if urgency.override_applied and urgency.override_keywords
        else ""
    )
    st.markdown("### 🚨 Urgency Level")
    st.markdown(
        f"""
        <div class="medlens-card" style="background:{style['background']};border-color:{style['color']}33;">
            <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;">
                <div>
                    <div style="font-size:1.1rem;font-weight:700;color:{style['color']};">
                        {style['icon']} {urgency.level}
                    </div>
                    <div style="margin-top:0.25rem;color:#27444c;">{style['label']}</div>
                </div>
                <div style="font-size:0.95rem;color:{style['color']};font-weight:600;">
                    {style['progress']} / 100
                </div>
            </div>
            <div class="urgency-bar">
                <div class="urgency-fill" style="width:{style['progress']}%;background:{style['color']};"></div>
            </div>
            {confidence}
            {override_note}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_reason(reason: str) -> None:
    st.markdown("### 💡 Reason")
    st.markdown(f'<div class="medlens-card">{reason}</div>', unsafe_allow_html=True)


def render_disclaimer() -> None:
    st.markdown("### ⚠️ Disclaimer")
    st.warning(DISCLAIMER_TEXT)


def render_translation_tools(summary: str) -> None:
    with st.expander("Translation and audio", expanded=False):
        language = st.selectbox("Language", list(LANGUAGE_MAP.keys()), key="language")
        if st.button("Translate summary", key="translate_summary"):
            try:
                translated = GoogleTranslator(
                    source="auto",
                    target=LANGUAGE_MAP[language],
                ).translate(summary)
                st.session_state.translated_summary = translated
            except Exception as exc:
                st.error(f"Translation failed: {exc}")

        translated_summary = st.session_state.get("translated_summary")
        if translated_summary:
            st.markdown("**Translated summary**")
            st.write(translated_summary)

        if st.button("Read aloud", key="read_aloud"):
            try:
                text = translated_summary or summary
                tts = gTTS(text=text, lang=LANGUAGE_MAP[language])
                audio_buffer = BytesIO()
                tts.write_to_fp(audio_buffer)
                audio_buffer.seek(0)
                st.audio(audio_buffer.read(), format="audio/mp3")
            except Exception as exc:
                st.error(f"Audio generation failed: {exc}")


def render_suggested_questions() -> str | None:
    st.caption("Suggested questions")
    columns = st.columns(len(SUGGESTED_QUESTIONS))
    selected_prompt = None

    for column, prompt in zip(columns, SUGGESTED_QUESTIONS):
        if column.button(prompt, use_container_width=True):
            selected_prompt = prompt

    return selected_prompt


def render_sources(source_chunks: list[str]) -> None:
    if not source_chunks:
        return

    st.caption("Source chunks used")
    for chunk in source_chunks:
        st.markdown(
            f'<div class="source-chip">{chunk}</div>',
            unsafe_allow_html=True,
        )
