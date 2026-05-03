from __future__ import annotations

import hashlib
import re

import fitz


def report_hash_from_bytes(pdf_bytes: bytes) -> str:
    return hashlib.sha256(pdf_bytes).hexdigest()


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
        pages = [page.get_text("text") for page in document]
    return normalize_report_text("\n".join(pages))


def normalize_report_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_patient_name(text: str) -> str:
    patterns = [
        r"(?im)^(?:patient|patient name|name)\s*[:\-]\s*(.+)$",
        r"(?im)^name\s+of\s+patient\s*[:\-]\s*(.+)$",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            candidate = match.group(1).strip()
            return re.split(r"\s{2,}|\t", candidate)[0].strip()
    return "Not available"


def extract_findings_section(text: str) -> str:
    patterns = [
        r"(?is)findings\s*[:\-]?\s*(.+?)(?=\n(?:impression|conclusion|opinion|advice|recommendation)\b)",
        r"(?is)impression\s*[:\-]?\s*(.+?)(?=\n(?:recommendation|advice|clinical history)\b)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return normalize_report_text(match.group(1))
    return ""


def derive_primary_context(text: str) -> str:
    findings = extract_findings_section(text)
    if findings and len(findings) >= 80:
        return findings
    return text

