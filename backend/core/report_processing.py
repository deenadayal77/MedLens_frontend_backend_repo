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


def remove_report_boilerplate(text: str) -> str:
    patterns = [
        r"(?im)^page \d+ of \d+\s*$",
        r"(?im)^report approved on\s*$",
        r"(?im)^nationalrad\s*\|.*$",
        r"(?im)^this report was electronically signed.*$",
        r"(?im)^\[\s*nationalrad.*\]\s*$",
    ]
    for pattern in patterns:
        text = re.sub(pattern, "", text)
    return normalize_report_text(text)


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
            return remove_report_boilerplate(match.group(1))
    return ""


def extract_impression_section(text: str) -> str:
    patterns = [
        r"(?is)impression\s*[:\-]?\s*(.+?)(?=\n(?:signed|electronically signed|\[|$))",
        r"(?is)conclusion\s*[:\-]?\s*(.+?)(?=\n(?:signed|electronically signed|\[|$))",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return remove_report_boilerplate(match.group(1))
    return ""


def derive_primary_context(text: str) -> str:
    findings = extract_findings_section(text)
    impression = extract_impression_section(text)

    sections = []
    if impression:
        sections.append(f"IMPRESSION\n{impression}")
    if findings:
        sections.append(f"FINDINGS\n{findings}")

    combined = "\n\n".join(section for section in sections if section.strip())
    if combined and len(combined) >= 80:
        return combined
    return remove_report_boilerplate(text)
