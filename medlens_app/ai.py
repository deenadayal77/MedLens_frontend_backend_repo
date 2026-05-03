from __future__ import annotations

import re
from functools import lru_cache

from langchain_classic.chains import ConversationalRetrievalChain
from langchain_classic.memory import ConversationBufferMemory
from langchain_classic.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from medlens_app.config import (
    CHATBOT_SYSTEM_PROMPT,
    DEFAULT_GEMINI_CHAT_MODEL,
    DEFAULT_GEMINI_EMBEDDING_MODEL,
    DEFAULT_GEMINI_MODEL,
    QUESTION_REWRITE_PROMPT,
    SAFETY_OVERRIDE_KEYWORDS,
    SUMMARY_PROMPT,
    URGENCY_PROMPT,
)
from medlens_app.models import ChatReply, UrgencyAssessment


@lru_cache(maxsize=1)
def get_summary_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=DEFAULT_GEMINI_MODEL,
        temperature=0,
        max_output_tokens=500,
    )


@lru_cache(maxsize=1)
def get_chat_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=DEFAULT_GEMINI_CHAT_MODEL,
        temperature=0,
        max_output_tokens=700,
    )


@lru_cache(maxsize=1)
def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=DEFAULT_GEMINI_EMBEDDING_MODEL,
    )


def _extract_text(response) -> str:
    content = getattr(response, "content", response)
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
            else:
                text = getattr(item, "text", "")
                if text:
                    parts.append(str(text))
        return "\n".join(part for part in parts if part).strip()
    return str(content).strip()


def build_vectorstore(report_text: str, report_hash: str) -> Chroma:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1400,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    documents = splitter.create_documents(
        [report_text],
        metadatas=[{"report_hash": report_hash}],
    )
    return Chroma.from_documents(
        documents=documents,
        embedding=get_embeddings(),
        collection_name=f"medlens-{report_hash[:12]}",
    )


def _format_docs(documents: list[Document]) -> str:
    return "\n\n".join(document.page_content for document in documents)


def generate_summary(vectorstore: Chroma, report_text: str) -> str:
    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 3, "fetch_k": 6},
    )
    docs = retriever.invoke(
        "Summarize the most important findings, impression, and notable abnormalities "
        "from this medical report in simple patient-friendly language."
    )
    context = _format_docs(docs) or report_text
    prompt = SUMMARY_PROMPT.format(context=context)
    summary = get_summary_llm().invoke(prompt)
    return _extract_text(summary)


def generate_summary_from_context(report_text: str) -> str:
    prompt = SUMMARY_PROMPT.format(context=report_text)
    summary = get_summary_llm().invoke(prompt)
    return _extract_text(summary)


def _extract_urgency_level(raw_output: str) -> str | None:
    match = re.search(
        r"Urgency:\s*(VERY_LOW|LOW|MODERATE|HIGH|CRITICAL)",
        raw_output,
        flags=re.IGNORECASE,
    )
    if match:
        return match.group(1).upper()
    return None


def _extract_reason(raw_output: str) -> str:
    match = re.search(r"Reason:\s*(.+)", raw_output, flags=re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()
    return "The report should be reviewed by a qualified doctor for confirmation."


def classify_urgency(summary: str, full_report_text: str = "") -> UrgencyAssessment:
    prompt = URGENCY_PROMPT.format(summary=summary)
    raw_output = _extract_text(get_summary_llm().invoke(prompt))

    urgency_level = _extract_urgency_level(raw_output) or "MODERATE"
    reason = _extract_reason(raw_output)
    confidence = 0.88 if _extract_urgency_level(raw_output) else 0.55

    combined_text = f"{summary}\n{full_report_text}".lower()
    override_keywords = [
        keyword for keyword in SAFETY_OVERRIDE_KEYWORDS if keyword in combined_text
    ]

    if override_keywords:
        urgency_level = "CRITICAL"
        reason = (
            "High-risk terms were detected in the report "
            f"({', '.join(override_keywords)}), so immediate medical review is safest."
        )
        confidence = 1.0
        return UrgencyAssessment(
            level=urgency_level,
            reason=reason,
            confidence=confidence,
            override_applied=True,
            override_keywords=override_keywords,
        )

    return UrgencyAssessment(level=urgency_level, reason=reason, confidence=confidence)


def build_chat_chain(vectorstore: Chroma, urgency: UrgencyAssessment):
    qa_prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=(
            f"{CHATBOT_SYSTEM_PROMPT.strip()}\n\n"
            "Current urgency assessment: {urgency_level}\n"
            "Urgency explanation: {urgency_reason}\n\n"
            "Report context:\n{context}\n\n"
            "Patient question: {question}\n\n"
            "Answer in simple language. If the answer is not supported by the report "
            "context, say that the report does not clearly state it."
        ),
    ).partial(urgency_level=urgency.level, urgency_reason=urgency.reason)

    condense_prompt = PromptTemplate(
        input_variables=["chat_history", "question"],
        template=QUESTION_REWRITE_PROMPT.strip(),
    )

    memory = ConversationBufferMemory(
        memory_key="chat_history",
        input_key="question",
        return_messages=True,
        output_key="answer",
    )

    return ConversationalRetrievalChain.from_llm(
        llm=get_chat_llm(),
        retriever=vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 3, "fetch_k": 6},
        ),
        memory=memory,
        return_source_documents=True,
        combine_docs_chain_kwargs={"prompt": qa_prompt},
        condense_question_prompt=condense_prompt,
        verbose=False,
    )


def chatbot_response(chat_chain, question: str) -> ChatReply:
    result = chat_chain.invoke({"question": question})
    answer = str(result.get("answer", "")).strip()
    source_documents = result.get("source_documents") or []
    source_chunks = []

    for document in source_documents[:3]:
        chunk = re.sub(r"\s+", " ", document.page_content).strip()
        if chunk:
            source_chunks.append(chunk[:220] + ("..." if len(chunk) > 220 else ""))

    return ChatReply(answer=answer, source_chunks=source_chunks)
