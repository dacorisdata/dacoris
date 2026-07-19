"""Export grant proposals to PDF and Word with preserved section formatting."""
from __future__ import annotations

import html
import re
from dataclasses import dataclass
from io import BytesIO
from typing import Optional

TEAL = "#16a699"


@dataclass
class ExportSection:
    title: str
    content_html: str
    word_count: int = 0


@dataclass
class ExportProposal:
    title: str
    sections: Optional[list[ExportSection]] = None


def _slugify_filename(title: str, ext: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title or "proposal", flags=re.UNICODE)
    slug = re.sub(r"[-\s]+", "-", slug).strip("-").lower()
    slug = slug[:80] or "proposal"
    return f"{slug}.{ext}"


def _sanitize_html(fragment: str) -> str:
    if not fragment:
        return ""
    cleaned = re.sub(r"<script[^>]*>.*?</script>", "", fragment, flags=re.I | re.S)
    cleaned = re.sub(r"<style[^>]*>.*?</style>", "", cleaned, flags=re.I | re.S)
    cleaned = re.sub(r"\son\w+\s*=\s*(['\"]).*?\1", "", cleaned, flags=re.I)
    return cleaned.strip()


def _build_export_html(proposal: ExportProposal) -> str:
    title = html.escape(proposal.title or "Proposal")
    section_blocks = []
    for section in proposal.sections or []:
        heading = html.escape(section.title or "Section")
        body = _sanitize_html(section.content_html or "")
        if not body:
            body = "<p><em>No content</em></p>"
        section_blocks.append(
            f'<h2 class="section-title">{heading}</h2>'
            f'<div class="section-content">{body}</div>'
        )

    if not section_blocks:
        section_blocks.append("<p><em>No sections have been added to this proposal yet.</em></p>")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{title}</title>
  <style>
    @page {{
      size: A4;
      margin: 2cm;
    }}
    body {{
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #111827;
    }}
    h1 {{
      font-size: 20pt;
      color: {TEAL};
      margin: 0 0 18pt;
      line-height: 1.25;
    }}
    h2.section-title {{
      font-size: 14pt;
      color: {TEAL};
      margin: 22pt 0 10pt;
      page-break-after: avoid;
    }}
    .section-content p {{
      margin: 0 0 10pt;
    }}
    .section-content h1, .section-content h2, .section-content h3,
    .section-content h4, .section-content h5, .section-content h6 {{
      margin: 14pt 0 8pt;
      page-break-after: avoid;
    }}
    .section-content ul, .section-content ol {{
      margin: 0 0 10pt 18pt;
      padding: 0;
    }}
    .section-content li {{
      margin-bottom: 4pt;
    }}
    .section-content table {{
      border-collapse: collapse;
      width: 100%;
      margin: 10pt 0;
      font-size: 10pt;
    }}
    .section-content th, .section-content td {{
      border: 1px solid #cbd5e1;
      padding: 6pt 8pt;
      vertical-align: top;
      text-align: left;
    }}
    .section-content th {{
      background: #f8fafc;
      font-weight: bold;
    }}
    .section-content blockquote {{
      border-left: 3px solid {TEAL};
      margin: 10pt 0;
      padding: 4pt 0 4pt 12pt;
      color: #475569;
    }}
    .section-content pre, .section-content code {{
      font-family: Courier, monospace;
      font-size: 10pt;
      background: #f8fafc;
    }}
    .section-content pre {{
      padding: 10pt;
      border: 1px solid #e2e8f0;
      white-space: pre-wrap;
    }}
    .section-content img {{
      max-width: 100%;
      height: auto;
    }}
    .section-content a {{
      color: {TEAL};
      text-decoration: underline;
    }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  {"".join(section_blocks)}
</body>
</html>"""


def _build_word_html(proposal: ExportProposal) -> str:
    """Word-compatible HTML document that preserves rich editor formatting."""
    inner = _build_export_html(proposal)
    style_match = re.search(r"<style>(.*?)</style>", inner, re.S)
    body_match = re.search(r"<body>(.*?)</body>", inner, re.S)
    styles = style_match.group(1) if style_match else ""
    body = body_match.group(1) if body_match else ""
    title = html.escape(proposal.title or "Proposal")

    return f"""<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>{title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>{styles}</style>
</head>
<body>{body}</body>
</html>"""


def generate_proposal_pdf(proposal: ExportProposal) -> tuple[bytes, str]:
    html_doc = _build_export_html(proposal)
    buffer = BytesIO()

    try:
        from xhtml2pdf import pisa

        result = pisa.CreatePDF(
            src=html_doc,
            dest=buffer,
            encoding="utf-8",
        )
        if not result.err:
            pdf_bytes = buffer.getvalue()
            if pdf_bytes.startswith(b"%PDF"):
                return pdf_bytes, _slugify_filename(proposal.title, "pdf")
    except Exception:
        pass

    buffer = BytesIO()
    return _generate_pdf_reportlab(proposal, html_doc, buffer)


def _generate_pdf_reportlab(
    proposal: ExportProposal,
    html_doc: str,
    buffer: BytesIO,
) -> tuple[bytes, str]:
    """Fallback PDF renderer when xhtml2pdf is unavailable."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=proposal.title,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ProposalTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor(TEAL),
        spaceAfter=14,
    )
    section_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor(TEAL),
        spaceBefore=14,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "SectionBody",
        parent=styles["BodyText"],
        fontSize=11,
        leading=15,
        spaceAfter=8,
    )

    story = [Paragraph(html.escape(proposal.title or "Proposal"), title_style), Spacer(1, 0.2 * cm)]
    for section in proposal.sections or []:
        story.append(Paragraph(html.escape(section.title or "Section"), section_style))
        for block in _html_blocks_for_reportlab(section.content_html or ""):
            story.append(Paragraph(block, body_style))

    doc.build(story)
    filename = _slugify_filename(proposal.title, "pdf")
    return buffer.getvalue(), filename


def _html_blocks_for_reportlab(html_content: str) -> list[str]:
    if not html_content:
        return ["<i>No content</i>"]

    text = _sanitize_html(html_content)
    text = re.sub(r"<br\s*/?>", "<br/>", text, flags=re.I)
    text = re.sub(r"</(p|div|h[1-6]|li|tr|blockquote)>", "<br/>", text, flags=re.I)
    text = re.sub(r"<li[^>]*>", "• ", text, flags=re.I)
    text = re.sub(r"<strong>", "<b>", text, flags=re.I)
    text = re.sub(r"</strong>", "</b>", text, flags=re.I)
    text = re.sub(r"<em>", "<i>", text, flags=re.I)
    text = re.sub(r"</em>", "</i>", text, flags=re.I)
    text = re.sub(r"<h[1-6][^>]*>", "<b>", text, flags=re.I)
    text = re.sub(r"</h[1-6]>", "</b><br/>", text, flags=re.I)
    text = re.sub(r"<(?!/?(b|i|u|br/?>|sup|sub)\b)[^>]+>", "", text, flags=re.I)
    text = html.unescape(text)
    text = text.replace("&", "&amp;")

    blocks = [chunk.strip() for chunk in re.split(r"<br/?>", text, flags=re.I) if chunk.strip()]
    return blocks or ["<i>No content</i>"]


def generate_proposal_docx(proposal: ExportProposal) -> tuple[bytes, str]:
    word_html = _build_word_html(proposal).encode("utf-8")
    filename = _slugify_filename(proposal.title, "doc")
    return word_html, filename


def export_proposal(proposal: ExportProposal, fmt: str) -> tuple[bytes, str, str]:
    normalized = (fmt or "pdf").lower().strip()
    if normalized == "pdf":
        content, filename = generate_proposal_pdf(proposal)
        return content, filename, "application/pdf"
    if normalized in {"docx", "word", "doc"}:
        content, filename = generate_proposal_docx(proposal)
        return content, filename, "application/msword"
    raise ValueError(f"Unsupported export format: {fmt}")
