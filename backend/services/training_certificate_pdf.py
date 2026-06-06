"""Generate training completion certificate PDFs."""
from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def generate_certificate_pdf(
    *,
    recipient_name: str,
    program_title: str,
    certificate_number: str,
    verification_code: str,
    cpd_hours: float,
    issue_date,
    institution_name: str = "DACORIS",
) -> bytes:
    buffer = BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    teal = colors.HexColor("#16a699")
    navy = colors.HexColor("#0b3c5d")
    muted = colors.HexColor("#64748b")

    c.setStrokeColor(teal)
    c.setLineWidth(3)
    c.rect(1.2 * cm, 1.2 * cm, width - 2.4 * cm, height - 2.4 * cm)

    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.rect(1.6 * cm, 1.6 * cm, width - 3.2 * cm, height - 3.2 * cm)

    c.setFillColor(teal)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2, height - 2.4 * cm, institution_name.upper())

    c.setFillColor(navy)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 4.2 * cm, "Certificate of Completion")

    c.setFillColor(muted)
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 5.4 * cm, "This is to certify that")

    c.setFillColor(navy)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 6.8 * cm, recipient_name or "Participant")

    c.setFillColor(muted)
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 8.0 * cm, "has successfully completed the training programme")

    c.setFillColor(teal)
    c.setFont("Helvetica-Bold", 16)
    title_lines = _wrap_text(program_title or "Training Programme", 58)
    y = height - 9.4 * cm
    for line in title_lines[:3]:
        c.drawCentredString(width / 2, y, line)
        y -= 0.7 * cm

    issued = issue_date
    if isinstance(issued, str):
        try:
            issued = datetime.fromisoformat(issued.replace("Z", "+00:00"))
        except ValueError:
            issued = None
    date_str = issued.strftime("%d %B %Y") if issued else datetime.utcnow().strftime("%d %B %Y")

    c.setFillColor(muted)
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, 4.8 * cm, f"Issued: {date_str}  ·  CPD Hours: {cpd_hours or 0}")
    c.drawCentredString(width / 2, 4.0 * cm, f"Certificate No: {certificate_number}")
    c.drawCentredString(width / 2, 3.2 * cm, f"Verify at: dacoris.org  ·  Code: {verification_code}")

    c.setFillColor(teal)
    c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(width / 2, 2.2 * cm, "Capacity Building & Professional Development")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


def _wrap_text(text: str, max_len: int) -> list:
    words = text.split()
    lines, current = [], []
    for word in words:
        trial = " ".join(current + [word])
        if len(trial) <= max_len:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines or [text]
