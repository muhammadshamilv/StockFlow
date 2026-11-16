"""Branded A4 invoice rendered with ReportLab (pure Python, no system deps)."""

from io import BytesIO

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import Sale

BRAND = colors.HexColor("#2563EB")
INK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#E2E8F0")
SOFT = colors.HexColor("#F1F5F9")
DANGER = colors.HexColor("#DC2626")


def _rs(value) -> str:
    # Built-in PDF fonts have no ₹ glyph, so use the "Rs." convention
    return f"Rs. {value:,.2f}"


def render_invoice(sale: Sale) -> bytes:
    cfg = settings.STOCKFLOW
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Invoice {sale.invoice_number}",
        author=cfg["COMPANY_NAME"],
    )
    styles = getSampleStyleSheet()
    h_brand = ParagraphStyle(
        "brand", parent=styles["Title"], textColor=BRAND, fontSize=22, alignment=0, spaceAfter=2
    )
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8.5, textColor=MUTED, leading=12)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=9.5, textColor=INK, leading=13)
    right = ParagraphStyle("right", parent=body, alignment=TA_RIGHT)
    label = ParagraphStyle("label", parent=small, fontName="Helvetica-Bold", textColor=MUTED)

    created = timezone.localtime(sale.created_at)
    story = []

    # Header: company + invoice meta
    header = Table(
        [
            [
                [
                    Paragraph("StockFlow", h_brand),
                    Paragraph(cfg["COMPANY_NAME"], body),
                    Paragraph(cfg["COMPANY_ADDRESS"], small),
                    Paragraph(f"GSTIN: {cfg['COMPANY_GSTIN']}", small),
                ],
                [
                    Paragraph("<b>TAX INVOICE</b>", ParagraphStyle("t", parent=right, fontSize=13)),
                    Spacer(1, 4),
                    Paragraph(f"<b>{sale.invoice_number}</b>", right),
                    Paragraph(
                        created.strftime("%d %b %Y, %I:%M %p"),
                        ParagraphStyle("r2", parent=right, textColor=MUTED),
                    ),
                    Paragraph(
                        f"Payment: {sale.get_payment_method_display()}",
                        ParagraphStyle("r3", parent=right, textColor=MUTED),
                    ),
                ],
            ]
        ],
        colWidths=[100 * mm, 74 * mm],
    )
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story += [header, Spacer(1, 8 * mm)]

    # Bill to
    customer = sale.customer
    bill_lines = [Paragraph("BILL TO", label)]
    if customer:
        bill_lines.append(Paragraph(f"<b>{customer.name}</b>", body))
        for extra in (
            customer.phone,
            customer.email,
            customer.address,
            customer.tax_id and f"GSTIN: {customer.tax_id}",
        ):
            if extra:
                bill_lines.append(Paragraph(extra, small))
    else:
        bill_lines.append(Paragraph("<b>Walk-in customer</b>", body))
    story += [Table([[bill_lines]], colWidths=[174 * mm]), Spacer(1, 6 * mm)]

    # Items table
    rows = [["#", "Item", "SKU", "Qty", "Rate", "Amount"]]
    for index, item in enumerate(sale.items.all(), start=1):
        rows.append(
            [
                str(index),
                Paragraph(item.product_name, body),
                item.sku,
                str(item.quantity),
                _rs(item.unit_price),
                _rs(item.line_total),
            ]
        )
    items = Table(rows, colWidths=[9 * mm, 72 * mm, 27 * mm, 14 * mm, 25 * mm, 27 * mm], repeatRows=1)
    items.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("LINEBELOW", (0, -1), (-1, -1), 0.6, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story += [items, Spacer(1, 5 * mm)]

    # Totals
    totals = [["Subtotal", _rs(sale.subtotal)]]
    if sale.discount_amount:
        totals.append(["Discount", f"- {_rs(sale.discount_amount)}"])
    totals.append([f"GST ({sale.tax_rate.normalize():f}%)", _rs(sale.tax_amount)])
    totals.append(["Total", _rs(sale.total)])
    if sale.amount_paid is not None:
        totals += [["Paid", _rs(sale.amount_paid)], ["Change", _rs(sale.change_due)]]
    totals_table = Table(totals, colWidths=[40 * mm, 34 * mm], hAlign="RIGHT")
    total_row = 2 if not sale.discount_amount else 3
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                ("FONTNAME", (0, total_row), (-1, total_row), "Helvetica-Bold"),
                ("FONTSIZE", (0, total_row), (-1, total_row), 12),
                ("TEXTCOLOR", (0, total_row), (-1, total_row), BRAND),
                ("LINEABOVE", (0, total_row), (-1, total_row), 0.8, INK),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story += [totals_table, Spacer(1, 10 * mm)]

    if sale.status == Sale.Status.CANCELLED:
        story.append(
            Paragraph(
                f"<b>CANCELLED</b> on {timezone.localtime(sale.cancelled_at):%d %b %Y} – {sale.cancel_reason}",
                ParagraphStyle("cancel", parent=body, textColor=DANGER),
            )
        )
        story.append(Spacer(1, 4 * mm))
    if sale.notes:
        story += [Paragraph("NOTES", label), Paragraph(sale.notes, body), Spacer(1, 6 * mm)]

    served_by = sale.created_by.full_name if sale.created_by else "—"
    story.append(Paragraph(f"Served by {served_by} · Thank you for your business!", small))
    story.append(Paragraph("This is a computer-generated invoice and does not require a signature.", small))

    doc.build(story)
    return buffer.getvalue()
