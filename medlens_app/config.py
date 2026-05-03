from __future__ import annotations

import os
from pathlib import Path

APP_TITLE = "MedLens"
APP_ICON = "🩺"
BASE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_GEMINI_MODEL = os.getenv("MEDLENS_GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_GEMINI_CHAT_MODEL = os.getenv(
    "MEDLENS_GEMINI_CHAT_MODEL",
    DEFAULT_GEMINI_MODEL,
)
DEFAULT_GEMINI_EMBEDDING_MODEL = os.getenv(
    "MEDLENS_GEMINI_EMBEDDING_MODEL",
    "models/gemini-embedding-001",
)

DISCLAIMER_TEXT = (
    "This is an AI-generated analysis and not a medical diagnosis. "
    "Please consult a qualified doctor."
)

SUMMARY_PROMPT = """
You are a medical assistant AI.

Use only the report context below to create a patient-friendly explanation.
Do not diagnose, prescribe treatment, or give medical advice.
Keep the tone calm, clear, and non-alarming.
If the report is unclear, say that directly instead of guessing.

Write the response in three short sections with markdown headings:
1. Key findings
2. What this means in simple language
3. Questions to discuss with a doctor

Report Context:
{context}
"""

URGENCY_PROMPT = """
You are a medical assistant AI.

Based on the report summary below, classify urgency into ONLY one of the following:

VERY_LOW: No significant abnormality
LOW: Minor issue, manageable
MODERATE: Needs monitoring or non-urgent consultation
HIGH: Requires medical attention soon
CRITICAL: Serious condition, immediate consultation required

Also provide a short, clear reason in simple language.

Report Summary:
{summary}

Output format:
Urgency: <VERY_LOW / LOW / MODERATE / HIGH / CRITICAL>
Reason: <text>
"""

CHATBOT_SYSTEM_PROMPT = """
You are a medical assistant chatbot.

* Use only the uploaded report context and retrieved source chunks
* Answer the patient's question directly using medically precise terminology
* Briefly define a medical term only when needed for clarity
* Do NOT give treatment advice, prescriptions, or diagnosis
* If the report does not clearly answer the question, say so directly
* Keep tone calm, professional, and non-alarming
* Mention urgency level when relevant
"""

QUESTION_REWRITE_PROMPT = """
Given the conversation and a follow-up question, rewrite the question so it can
be answered using the medical report context. Preserve the original meaning and
do not answer the question.

Chat History:
{chat_history}

Follow-up Question:
{question}

Standalone Question:
"""

SUGGESTED_QUESTIONS = [
    "Is this serious?",
    "What does this condition mean?",
    "What should I do next?",
    "Should I be worried?",
]

SAFETY_OVERRIDE_KEYWORDS = ["tumor", "malignant", "severe", "fracture", "bleeding"]

URGENCY_STYLES = {
    "VERY_LOW": {
        "label": "No significant issue",
        "color": "#198754",
        "background": "#e8f6ee",
        "icon": "🟢",
        "progress": 5,
    },
    "LOW": {
        "label": "Manageable / routine care",
        "color": "#2e8b57",
        "background": "#eef9f1",
        "icon": "🟢",
        "progress": 25,
    },
    "MODERATE": {
        "label": "Monitor condition",
        "color": "#a07800",
        "background": "#fff8db",
        "icon": "🟡",
        "progress": 50,
    },
    "HIGH": {
        "label": "Visit doctor soon",
        "color": "#b65c00",
        "background": "#fff0e1",
        "icon": "🟠",
        "progress": 75,
    },
    "CRITICAL": {
        "label": "Immediate medical attention required",
        "color": "#b42318",
        "background": "#fdeceb",
        "icon": "🔴",
        "progress": 100,
    },
}
