"""
FoodLens — PDF Report Generation Service
Generates professional, personalized health risk report PDFs for scanned products
using ReportLab.
"""

import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)

def generate_product_pdf(scored_result, ai_explanation=None) -> bytes:
    """
    Generates a PDF byte stream for a ScoredResult.

    Args:
        scored_result: ScoredResult instance with profile and ingredient details
        ai_explanation: Optional text explanation from Gemini

    Returns:
        bytes: PDF file content
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E293B'),
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#64748B'),
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#334155'),
    )

    # Determine risk color
    score = scored_result.normalized_score
    risk_label = scored_result.risk_label or 'Unknown'
    if score <= 30:
        score_color = colors.HexColor('#16A34A')  # Green
        bg_score_color = colors.HexColor('#DCFCE7')
    elif score <= 60:
        score_color = colors.HexColor('#D97706')  # Amber
        bg_score_color = colors.HexColor('#FEF3C7')
    else:
        score_color = colors.HexColor('#DC2626')  # Red
        bg_score_color = colors.HexColor('#FEE2E2')

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("🌿 <b>FoodLens</b> Health Analysis", title_style),
            Paragraph(f"Report Date: {datetime.now().strftime('%b %d, %Y')}<br/>Scan ID: #{scored_result.id}", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#CBD5E1'), spaceAfter=14))

    # 2. Product Summary & Score Banner
    product_name = scored_result.product_name or 'Scanned Food Product'
    barcode = scored_result.barcode or 'N/A'
    profile_name = scored_result.profile.profile_name if scored_result.profile else 'General Profile'

    conditions_list = []
    if scored_result.profile:
        conditions_list = [c.condition_name for c in scored_result.profile.conditions.all()]
    conditions_str = ', '.join(conditions_list) if conditions_list else 'None specified'

    summary_text = f"""
    <b>Product:</b> {product_name}<br/>
    <b>Barcode:</b> {barcode}<br/>
    <b>Target Profile:</b> {profile_name}<br/>
    <b>Profile Health Conditions:</b> {conditions_str}
    """

    score_badge_html = f"""
    <div align="center">
        <font size="24" color="{score_color.hexval()}"><b>{score}/100</b></font><br/>
        <font size="11" color="{score_color.hexval()}"><b>{risk_label.upper()}</b></font>
    </div>
    """

    banner_data = [
        [Paragraph(summary_text, body_style), Paragraph(score_badge_html, body_style)]
    ]
    banner_table = Table(banner_data, colWidths=[390, 150])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (1,0), (1,0), bg_score_color),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (1,0), (1,0), 1, score_color),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 12))

    # 3. Allergen Alert Banner (if applicable)
    if scored_result.has_allergen_warning:
        allergens = scored_result.allergen_details or ['Allergen detected']
        allergen_msg = f"⚠️ <b>ALLERGEN ALERT:</b> Contains triggers matching your profile: <b>{', '.join(allergens)}</b>"
        allergen_table = Table([[Paragraph(allergen_msg, ParagraphStyle('Allergen', parent=body_style, textColor=colors.HexColor('#991B1B')))]], colWidths=[540])
        allergen_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEE2E2')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#EF4444')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(allergen_table)
        story.append(Spacer(1, 10))

    # 4. Nutrition Facts (if available)
    if scored_result.nutrition_data:
        nd = scored_result.nutrition_data
        nutr_row = [
            f"Calories: {nd.get('energy_kcal', 'N/A')} kcal",
            f"Fat: {nd.get('fat', 'N/A')}g",
            f"Sugars: {nd.get('sugars', 'N/A')}g",
            f"Salt: {nd.get('salt', 'N/A')}g",
        ]
        nutr_table = Table([[Paragraph(f"<b>{item}</b>", body_style) for item in nutr_row]], colWidths=[135, 135, 135, 135])
        nutr_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(Paragraph("Nutrition Overview", section_heading))
        story.append(nutr_table)
        story.append(Spacer(1, 10))

    # 5. AI Explanation Section
    if ai_explanation:
        story.append(Paragraph("AI Health Insights (Gemini)", section_heading))
        ai_box = Table([[Paragraph(f"🤖 {ai_explanation}", body_style)]], colWidths=[540])
        ai_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94A3B8')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(ai_box)
        story.append(Spacer(1, 12))

    # 6. Ingredient Analysis Table
    story.append(Paragraph("Detailed Ingredient Breakdown", section_heading))

    details = scored_result.ingredient_details.select_related('ingredient').order_by('position').all()
    if details.exists():
        table_rows = [
            [
                Paragraph("<b>#</b>", body_style),
                Paragraph("<b>Ingredient</b>", body_style),
                Paragraph("<b>Category</b>", body_style),
                Paragraph("<b>Base Risk</b>", body_style),
                Paragraph("<b>Impact</b>", body_style),
                Paragraph("<b>Status</b>", body_style),
            ]
        ]

        for d in details:
            name = d.ingredient.name if d.ingredient else d.raw_token
            cat = d.ingredient.category.replace('_', ' ').title() if d.ingredient else 'Unknown'
            status_text = "⚠️ Allergen" if d.is_allergen_trigger else "Identified"
            status_color = colors.HexColor('#DC2626') if d.is_allergen_trigger else colors.HexColor('#16A34A')

            table_rows.append([
                Paragraph(str(d.position), body_style),
                Paragraph(name, body_style),
                Paragraph(cat, body_style),
                Paragraph(f"{d.base_risk_score}/10", body_style),
                Paragraph(f"{d.ingredient_impact:.2f}", body_style),
                Paragraph(f"<font color='{status_color.hexval()}'>{status_text}</font>", body_style),
            ])

        ing_table = Table(table_rows, colWidths=[30, 180, 120, 70, 70, 70])
        ing_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(ing_table)
    else:
        raw_ing = scored_result.ingredients_text or 'No ingredient details available.'
        story.append(Paragraph(f"<i>{raw_ing}</i>", body_style))

    story.append(Spacer(1, 20))

    # 7. Professional Footer Note
    footer_text = (
        "<i>Disclaimer: FoodLens provides personalized risk assessments based on ingredient analysis algorithms, "
        "WHO/FSSAI guidelines, and user-provided health conditions. This report is for educational purposes and is "
        "not medical advice.</i>"
    )
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=body_style, fontSize=8, leading=11, textColor=colors.HexColor('#64748B'))))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
