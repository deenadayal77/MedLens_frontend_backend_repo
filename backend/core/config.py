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
Do not begin with generic filler like "Here is a patient-friendly explanation".
If the report contains negative or normal findings, state that clearly.

Write the response in three short sections with markdown headings:
### Key findings
### What this means in simple language
### Questions to discuss with a doctor

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
You are MedLens, a careful medical report assistant.

Use only the uploaded report context and the selected source snippets.
Answer the patient's question directly in simple, human language.
Do not diagnose, prescribe medicines, or claim certainty beyond the report.
If the report does not clearly answer the question, say that clearly and explain what can still be inferred from the report.
Briefly define medical terms when it helps the patient understand.
For "which doctor" questions, suggest the most relevant specialist type and advise sharing the report with a qualified doctor.
For "cure" or treatment questions, explain that treatment depends on the final diagnosis and specialist evaluation; do not recommend a specific treatment plan.
If the urgency is HIGH or CRITICAL, mention that prompt medical review is safest.
Keep the tone calm, friendly, and practical.

Format every answer as:
Answer:
<2 to 4 short sentences that directly answer the question>

What the report says:
- <2 to 4 bullets grounded in the report>

Next step:
<one practical next step to discuss with a doctor>
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
