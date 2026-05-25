"""Extract metadata from uploaded Data Management Plan documents."""
from __future__ import annotations

import os
import re
import zipfile
from typing import Optional
from xml.etree import ElementTree

from services.ethics_certificate_parser import extract_text_from_file

GENERIC_DMP_TITLE_RE = re.compile(
    r"^(?:data management plan|dmp|research data management plan)$",
    re.I,
)


def _normalize_whitespace(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _clean_value(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "").strip(" :-–—|,")
    return value[:500]


def _extract_labeled(text: str, *labels: str) -> Optional[str]:
    for label in labels:
        escaped = re.escape(label).replace(r"\ ", r"\s+")
        for pattern in (
            rf"{escaped}\s*[:\-–—]\s*(.+?)(?=\n|$)",
            rf"{escaped}\s*[:\-–—]?\s*\n\s*(.+?)(?=\n|$)",
        ):
            match = re.search(pattern, text, re.I | re.S)
            if match:
                value = _clean_value(match.group(1))
                if value and len(value) >= 2:
                    return value
    return None


def _extract_docx_text(path: str) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            xml_bytes = archive.read("word/document.xml")
        root = ElementTree.fromstring(xml_bytes)
        namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        chunks = [
            node.text for node in root.iter(f"{namespace}t") if node.text and node.text.strip()
        ]
        return _normalize_whitespace(" ".join(chunks))
    except Exception:
        return ""


def extract_dmp_text(path: str, mime_type: Optional[str] = None, filename: Optional[str] = None) -> str:
    ext = os.path.splitext(filename or path)[1].lower()
    if ext == ".docx":
        text = _extract_docx_text(path)
        if text.strip():
            return text
    return extract_text_from_file(path, mime_type, filename)


def _title_from_filename(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    base = os.path.splitext(os.path.basename(filename))[0]
    base = re.sub(r"[_-]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    base = re.sub(r"^(dmp|data management plan)\s*", "", base, flags=re.I).strip()
    if len(base) >= 5 and not GENERIC_DMP_TITLE_RE.match(base):
        return base[:300]
    return None


def _title_from_text(text: str) -> Optional[str]:
    for labels in (
        ("plan title", "dmp title", "data management plan title"),
        ("project title", "study title", "research project title"),
        ("title",),
    ):
        value = _extract_labeled(text, *labels)
        if value and len(value) >= 8 and not GENERIC_DMP_TITLE_RE.match(value):
            return value

    lines = [_clean_value(line) for line in text.split("\n") if _clean_value(line)]
    for line in lines[:12]:
        if len(line) < 12 or len(line) > 220:
            continue
        if GENERIC_DMP_TITLE_RE.match(line):
            continue
        if re.search(r"\b(data management plan|table of contents|section \d+)\b", line, re.I):
            continue
        return line
    return None


def parse_dmp_fields(
    path: str,
    mime_type: Optional[str] = None,
    filename: Optional[str] = None,
    project_title: Optional[str] = None,
) -> dict:
    text = extract_dmp_text(path, mime_type, filename)
    plan_title = _title_from_text(text) or _title_from_filename(filename)
    if not plan_title and project_title:
        plan_title = f"Data Management Plan — {project_title}"

    return {
        "plan_title": plan_title,
        "types_of_data": _extract_labeled(
            text, "types of data", "type of data", "data types", "data to be collected"
        ),
        "estimated_volume": _extract_labeled(
            text, "estimated volume", "data volume", "volume of data", "expected volume"
        ),
        "data_formats": _extract_labeled(text, "data formats", "file formats", "format of data"),
        "repository": _extract_labeled(
            text, "repository", "data repository", "archive", "long-term repository"
        ),
        "retention_period": _extract_labeled(
            text, "retention period", "data retention", "retention", "preservation period"
        ),
        "primary_storage": _extract_labeled(
            text, "primary storage", "storage location", "data storage"
        ),
        "data_steward": _extract_labeled(text, "data steward", "data manager", "data custodian"),
        "funder": _extract_labeled(text, "funder", "funding body", "sponsor", "funding agency"),
        "text_extracted": bool(text.strip()),
    }
