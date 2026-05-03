from __future__ import annotations

import os

import streamlit as st

from medlens_app.ai import (
    build_chat_chain,
    build_vectorstore,
    chatbot_response,
    classify_urgency,
    generate_summary_from_context,
)
from medlens_app.config import APP_ICON, APP_TITLE
from medlens_app.models import AnalysisResult
from medlens_app.report_processing import (
    derive_primary_context,
    extract_patient_name,
    extract_text_from_pdf,
    report_hash_from_bytes,
)
from medlens_app.ui import (
    apply_theme,
    render_disclaimer,
    render_header,
    render_reason,
    render_sources,
    render_summary,
    render_suggested_questions,
    render_translation_tools,
    render_urgency_card,
)


def initialize_session_state() -> None:
    defaults = {
        "analysis_complete": False,
        "analysis_result": None,
        "vectorstore": None,
        "chat_chain": None,
        "messages": [],
        "urgency": None,
        "translated_summary": "",
        "active_report_hash": "",
        "chat_ready": False,
    }
    for key, value in defaults.items():
        st.session_state.setdefault(key, value)


def has_gemini_api_key() -> bool:
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))


def reset_analysis_state(new_hash: str) -> None:
    if st.session_state.active_report_hash == new_hash:
        return

    st.session_state.analysis_complete = False
    st.session_state.analysis_result = None
    st.session_state.vectorstore = None
    st.session_state.chat_chain = None
    st.session_state.messages = []
    st.session_state.urgency = None
    st.session_state.translated_summary = ""
    st.session_state.active_report_hash = new_hash
    st.session_state.chat_ready = False


@st.cache_resource(show_spinner=False)
def get_cached_vectorstore(report_text: str, report_hash: str):
    return build_vectorstore(report_text=report_text, report_hash=report_hash)


def run_analysis(pdf_bytes: bytes) -> AnalysisResult:
    report_hash = report_hash_from_bytes(pdf_bytes)
    reset_analysis_state(report_hash)

    report_text = extract_text_from_pdf(pdf_bytes)
    patient_name = extract_patient_name(report_text)
    primary_context = derive_primary_context(report_text)
    summary = generate_summary_from_context(primary_context)
    urgency = classify_urgency(summary=summary, full_report_text=report_text)

    analysis = AnalysisResult(
        patient_name=patient_name,
        report_text=report_text,
        primary_context=primary_context,
        summary=summary,
        urgency=urgency,
        report_hash=report_hash,
    )

    st.session_state.analysis_complete = True
    st.session_state.analysis_result = analysis
    st.session_state.vectorstore = None
    st.session_state.urgency = urgency
    st.session_state.chat_chain = None
    st.session_state.chat_ready = False
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                f"Based on your report, this falls under {urgency.level} urgency. "
                "You can ask me follow-up questions about the report in simple language."
            ),
            "sources": [],
        }
    ]
    return analysis


def ensure_chat_ready(analysis: AnalysisResult) -> None:
    if st.session_state.chat_ready and st.session_state.chat_chain is not None:
        return

    vectorstore = get_cached_vectorstore(
        report_text=analysis.primary_context,
        report_hash=analysis.report_hash,
    )
    st.session_state.vectorstore = vectorstore
    st.session_state.chat_chain = build_chat_chain(
        vectorstore=vectorstore,
        urgency=analysis.urgency,
    )
    st.session_state.chat_ready = True


def handle_chat_interaction(user_prompt: str) -> None:
    if not user_prompt:
        return

    st.session_state.messages.append(
        {"role": "user", "content": user_prompt, "sources": []}
    )

    analysis: AnalysisResult = st.session_state.analysis_result
    with st.spinner("Preparing chat context..."):
        ensure_chat_ready(analysis)

    with st.spinner("Reviewing report context..."):
        reply = chatbot_response(st.session_state.chat_chain, user_prompt)

    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": reply.answer,
            "sources": reply.source_chunks,
        }
    )


def render_chatbot() -> None:
    st.markdown("### 💬 Report Chatbot")
    if not st.session_state.chat_ready:
        st.caption(
            "The first question may take a bit longer while chat context is prepared."
        )
    selected_prompt = render_suggested_questions()

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            render_sources(message.get("sources", []))

    typed_prompt = st.chat_input("Ask a follow-up question about this report")
    prompt = typed_prompt or selected_prompt
    if prompt:
        handle_chat_interaction(prompt)
        st.rerun()


def main() -> None:
    st.set_page_config(page_title=APP_TITLE, page_icon=APP_ICON, layout="wide")
    apply_theme()
    initialize_session_state()
    render_header()

    if not has_gemini_api_key():
        st.error(
            "Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY, "
            "restart Streamlit, and try again."
        )
        st.stop()

    st.markdown("### Upload report")
    uploaded_pdf = st.file_uploader("Upload PDF medical report", type=["pdf"])

    if uploaded_pdf is None:
        st.info("Chatbot will be available after report analysis")
        return

    pdf_bytes = uploaded_pdf.getvalue()
    report_hash = report_hash_from_bytes(pdf_bytes)
    reset_analysis_state(report_hash)

    st.markdown(
        f"""
        <div class="medlens-card">
            <strong>Uploaded file:</strong> {uploaded_pdf.name}
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.button("Analyze report", type="primary", use_container_width=True):
        with st.spinner("Generating summary and urgency analysis..."):
            try:
                run_analysis(pdf_bytes)
            except Exception as exc:
                st.error(
                    "Analysis could not be completed. Please confirm your Gemini API key "
                    f"is set correctly and try again. Details: {exc}"
                )

    if not st.session_state.analysis_complete or not st.session_state.analysis_result:
        st.info("Chatbot will be available after report analysis")
        return

    analysis: AnalysisResult = st.session_state.analysis_result
    st.caption(f"Patient name: {analysis.patient_name}")
    render_summary(analysis.summary)
    render_urgency_card(analysis.urgency)
    render_reason(analysis.urgency.reason)
    render_disclaimer()
    render_translation_tools(analysis.summary)
    render_chatbot()
