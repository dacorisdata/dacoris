"""Extract metadata from ethics approval certificate files (PDF / images)."""
from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Optional

GENERIC_TITLE_RE = re.compile(
    r"^(?:certificate\s+of\s+(?:ethical\s+)?clearance|ethics\s+approval\s+certificate|"
    r"approval\s+certificate|certificate\s+of\s+approval|ethical\s+clearance\s+certificate)$",
    re.I,
)

NOISE_LINE = re.compile(
    r"^(?:page\s+\d+|signed|signature|stamp|official\s+seal|compliance\s+status|"
    r"chairperson|director\s+of\s+compliance|date)$",
    re.I,
)


def _normalize_whitespace(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _extract_pdf_text(path: str) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    try:
        reader = PdfReader(path)
        chunks = [page.extract_text() or "" for page in reader.pages[:5]]
        return _normalize_whitespace("\n".join(chunks))
    except Exception:
        return ""


def _extract_image_text(path: str) -> str:
    try:
        import pytesseract
        from PIL import Image, ImageOps
    except ImportError:
        return ""
    try:
        image = Image.open(path)
        image = ImageOps.exif_transpose(image)
        gray = ImageOps.grayscale(image)
        gray = ImageOps.autocontrast(gray)
        config = "--psm 6 -c preserve_interword_spaces=1"
        return _normalize_whitespace(pytesseract.image_to_string(gray, config=config))
    except Exception:
        return ""


def extract_text_from_file(path: str, mime_type: Optional[str] = None, filename: Optional[str] = None) -> str:
    ext = os.path.splitext(filename or path)[1].lower()
    mime = (mime_type or "").lower()

    if ext == ".pdf" or mime == "application/pdf":
        text = _extract_pdf_text(path)
        if text.strip():
            return text

    if ext in {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"} or mime.startswith("image/"):
        return _extract_image_text(path)

    return ""


def _clean_value(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "").strip(" :-–—|,")
    return value[:300]


def _parse_date(raw: str) -> Optional[str]:
    raw = _clean_value(raw)
    if not raw:
        return None
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%m/%d/%Y", "%m-%d-%Y",
        "%d/%m/%y", "%d-%m-%y",
        "%d %B %Y", "%d %b %Y",
        "%B %d, %Y", "%B %d %Y",
        "%b %d, %Y", "%b %d %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _label_patterns(*labels: str) -> list[str]:
    patterns = []
    for label in labels:
        escaped = re.escape(label).replace(r"\ ", r"\s+")
        patterns.append(rf"{escaped}\s*[:\-–—]\s*(.+?)(?=\n|$)")
        patterns.append(rf"{escaped}\s*[:\-–—]?\s*\n\s*(.+?)(?=\n|$)")
    return patterns


def _extract_labeled(text: str, *labels: str) -> Optional[str]:
    for pattern in _label_patterns(*labels):
        match = re.search(pattern, text, re.I | re.S)
        if match:
            value = _clean_value(match.group(1))
            if value and len(value) >= 2:
                return value
    return None


def _extract_date_labeled(text: str, *labels: str) -> Optional[str]:
    raw = _extract_labeled(text, *labels)
    if raw:
        parsed = _parse_date(raw)
        if parsed:
            return parsed
        date_match = re.search(
            r"(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4})",
            raw,
            re.I,
        )
        if date_match:
            return _parse_date(date_match.group(1))
    return None


def _is_generic_title(value: str) -> bool:
    return bool(GENERIC_TITLE_RE.match(_clean_value(value)))


def _extract_project_title(text: str, filename: Optional[str]) -> Optional[str]:
    for labels in (
        ("project title",),
        ("study title",),
        ("research title",),
        ("title of study",),
        ("title of project",),
        ("protocol title",),
    ):
        value = _extract_labeled(text, *labels)
        if value and not _is_generic_title(value) and len(value) >= 8:
            return value

    for pattern in (
        r"(?:study|project|research|protocol)\s+title[\s:–—-]+(.+?)(?=\n|$)",
    ):
        match = re.search(pattern, text, re.I)
        if match:
            candidate = _clean_value(match.group(1))
            if candidate and not _is_generic_title(candidate) and len(candidate) >= 8:
                return candidate

    lines = [_clean_value(line) for line in text.split("\n") if _clean_value(line)]
    candidates = []
    for line in lines:
        if len(line) < 20 or len(line) > 220:
            continue
        if _is_generic_title(line):
            continue
        if NOISE_LINE.match(line):
            continue
        if re.search(r"^(protocol id|principal investigator|approval date|expiration date|review type|entity approved)\b", line, re.I):
            continue
        if re.search(r"\b(review board|ethics committee|certificate|clearance|compliance division)\b", line, re.I) and len(line) < 55:
            continue
        if line.isupper() and len(line) < 60:
            continue
        candidates.append(line)

    if candidates:
        return max(candidates, key=len)

    if filename:
        stem = os.path.splitext(os.path.basename(filename))[0]
        stem = re.sub(r"[_-]+", " ", stem).strip()
        if len(stem) >= 4:
            return stem.title()
    return None


def _extract_issuing_body(text: str) -> Optional[str]:
    lines = [_clean_value(line) for line in text.split("\n")[:25] if _clean_value(line)]
    org_lines = []
    for line in lines:
        if re.search(r"\b(chairperson|director of compliance|official seal|signed|signature)\b", line, re.I):
            continue
        if re.search(r"\b(REVIEW BOARD|ETHICS COMMITTEE|IRB|REC)\b", line, re.I):
            if _is_generic_title(line):
                continue
            org_lines.append(line)

    if org_lines:
        primary = org_lines[0]
        if len(org_lines) > 1 and len(primary) < 80:
            secondary = org_lines[1]
            if re.search(r"committee|division|compliance|board", secondary, re.I):
                if not re.search(r"\b(chairperson|director of compliance|dr\.|prof\.)\b", secondary, re.I):
                    return f"{primary} — {secondary}"
        return primary

    labeled = _extract_labeled(text, "issuing authority", "issuing body")
    if labeled and len(labeled) >= 6 and not re.search(r"\b(chairperson|director of compliance|dr\.|prof\.)\b", labeled, re.I):
        return labeled

    for pattern in (
        r"((?:global\s+)?[\w\s&]+research\s+review\s+board)",
        r"((?:institutional\s+)?review\s+board[^,\n]{0,100})",
        r"((?:research\s+)?ethics\s+(?:review\s+)?committee[^,\n]{0,100})",
        r"((?:national\s+)?(?:health\s+)?research\s+ethics\s+committee[^,\n]{0,100})",
    ):
        match = re.search(pattern, text, re.I)
        if match:
            candidate = _clean_value(match.group(1))
            if len(candidate) >= 8 and not re.search(r"\b(chairperson|director of compliance)\b", candidate, re.I):
                return candidate

    return None


def _extract_expiration_date(text: str) -> Optional[str]:
    for labels in (
        ("expiration date",),
        ("expiry date",),
        ("expires on",),
        ("valid until",),
        ("valid to",),
        ("approval valid until",),
    ):
        parsed = _extract_date_labeled(text, *labels)
        if parsed:
            return parsed

    lower = text.lower()
    patterns = [
        r"expiration\s+date[\s:–—-]*(\d{1,2}\s+\w+\s+\d{4})",
        r"expiration\s+date[\s:–—-]*(\w+\s+\d{1,2},?\s+\d{4})",
        r"expir(?:y|es|ation)[\s:–—-]*(\d{1,2}\s+\w+\s+\d{4})",
        r"valid\s+until[\s:–—-]*(\d{1,2}\s+\w+\s+\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, lower, re.I)
        if match:
            parsed = _parse_date(match.group(1))
            if parsed:
                return parsed

    dated = []
    for token in re.findall(r"(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+\w+\s+\d{4})", text):
        parsed = _parse_date(token)
        if parsed:
            dated.append(parsed)
    if len(dated) >= 2:
        return max(dated)
    if dated:
        return dated[0]
    return None


def _extract_approval_date(text: str) -> Optional[str]:
    for labels in (
        ("approval date",),
        ("date of approval",),
        ("approved on",),
        ("date approved",),
    ):
        parsed = _extract_date_labeled(text, *labels)
        if parsed:
            return parsed
    return None


def _extract_protocol_id(text: str) -> Optional[str]:
    value = _extract_labeled(text, "protocol id", "protocol number", "reference number", "certificate number", "irb number")
    if value:
        return value
    match = re.search(r"\b([A-Z]{2,8}-\d{4}-[A-Z0-9]{2,8})\b", text)
    return match.group(1) if match else None


def _extract_principal_investigator(text: str) -> Optional[str]:
    value = _extract_labeled(text, "principal investigator", "lead investigator", "investigator", "pi")
    if value and not re.search(r"^(stephen|dr\.|prof\.)\s*$", value, re.I):
        return value
    match = re.search(r"principal investigator[\s:–—-]+(.+?)(?=\n|$)", text, re.I)
    if match:
        return _clean_value(match.group(1))
    return None


def _extract_review_type(text: str) -> Optional[str]:
    return _extract_labeled(text, "review type", "type of review", "approval type")


def _extract_entity_approved(text: str) -> Optional[str]:
    return _extract_labeled(text, "entity approved", "institution approved", "organization approved", "sponsor")


def suggest_project_id(text: str, projects: list[dict]) -> Optional[str]:
    if not text or not projects:
        return None
    lower = text.lower()
    best_id = None
    best_len = 0
    for project in projects:
        title = (project.get("title") or "").strip()
        if len(title) < 6:
            continue
        if title.lower() in lower and len(title) > best_len:
            best_id = project.get("id")
            best_len = len(title)
    return best_id


def build_certificate_notes(parsed: dict) -> Optional[str]:
    lines = []
    if parsed.get("issuing_body"):
        lines.append(f"Issuing body: {parsed['issuing_body']}")
    if parsed.get("protocol_id"):
        lines.append(f"Protocol ID: {parsed['protocol_id']}")
    if parsed.get("principal_investigator"):
        lines.append(f"Principal Investigator: {parsed['principal_investigator']}")
    if parsed.get("approval_date"):
        lines.append(f"Approval date: {parsed['approval_date']}")
    if parsed.get("review_type"):
        lines.append(f"Review type: {parsed['review_type']}")
    if parsed.get("entity_approved"):
        lines.append(f"Entity approved: {parsed['entity_approved']}")
    return "\n".join(lines) if lines else None


def parse_certificate_fields(
    text: str,
    filename: Optional[str] = None,
    projects: Optional[list[dict]] = None,
) -> dict:
    project_title = _extract_project_title(text, filename)
    issuing_body = _extract_issuing_body(text)
    approved_until = _extract_expiration_date(text)
    approval_date = _extract_approval_date(text)
    protocol_id = _extract_protocol_id(text)
    principal_investigator = _extract_principal_investigator(text)
    review_type = _extract_review_type(text)
    entity_approved = _extract_entity_approved(text)
    suggested_project_id = suggest_project_id(text, projects or [])

    core = [project_title, issuing_body, approved_until]
    filled = sum(1 for v in core if v)
    extras = sum(1 for v in [protocol_id, principal_investigator, approval_date, review_type] if v)

    if filled >= 2 or (filled >= 1 and extras >= 2):
        confidence = "high"
    elif filled >= 1 or extras >= 1:
        confidence = "partial"
    else:
        confidence = "low"

    return {
        "title": project_title,
        "issuing_body": issuing_body,
        "approved_until": approved_until,
        "approval_date": approval_date,
        "protocol_id": protocol_id,
        "principal_investigator": principal_investigator,
        "review_type": review_type,
        "entity_approved": entity_approved,
        "suggested_project_id": suggested_project_id,
        "confidence": confidence,
        "text_extracted": bool(text.strip()),
    }
