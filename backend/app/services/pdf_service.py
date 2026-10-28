from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
import io

def generate_review_pdf(review) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []

    # Colors
    primary = HexColor("#7C3AED")
    critical_color = HexColor("#EF4444")
    warning_color = HexColor("#F59E0B")
    suggestion_color = HexColor("#3B82F6")
    success_color = HexColor("#22C55E")

    # Title
    title_style = ParagraphStyle("title", fontSize=24, textColor=primary, spaceAfter=6, fontName="Helvetica-Bold")
    story.append(Paragraph("AI Code Review Report", title_style))

    # Meta info
    meta_style = ParagraphStyle("meta", fontSize=10, textColor=colors.gray, spaceAfter=20)
    story.append(Paragraph(f"Language: {review.language.upper()}  |  Date: {review.created_at.strftime('%B %d, %Y')}", meta_style))

    # Score
    score_color = success_color if review.score >= 80 else (warning_color if review.score >= 50 else critical_color)
    score_style = ParagraphStyle("score", fontSize=36, textColor=score_color, spaceAfter=4, fontName="Helvetica-Bold")
    story.append(Paragraph(f"{review.score}/100", score_style))
    story.append(Paragraph("Code Quality Score", meta_style))
    story.append(Spacer(1, 20))

    # Summary
    section_style = ParagraphStyle("section", fontSize=14, textColor=primary, spaceAfter=8, fontName="Helvetica-Bold")
    body_style = ParagraphStyle("body", fontSize=11, spaceAfter=16, leading=16)
    story.append(Paragraph("Summary", section_style))
    story.append(Paragraph(review.summary, body_style))

    # Static metrics
    if review.static_metrics:
        story.append(Paragraph("Code Metrics", section_style))
        metrics_data = [["Metric", "Value"]]
        metric_labels = {
            "lines_of_code": "Lines of Code",
            "avg_complexity": "Avg Complexity",
            "maintainability_index": "Maintainability Index",
            "comment_lines": "Comment Lines"
        }
        for key, label in metric_labels.items():
            if key in review.static_metrics:
                metrics_data.append([label, str(review.static_metrics[key])])

        metrics_table = Table(metrics_data, colWidths=[250, 200])
        metrics_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#F5F3FF")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 20))

    # Issues
    if review.issues:
        story.append(Paragraph("Issues Found", section_style))
        severity_colors = {
            "critical": critical_color,
            "warning": warning_color,
            "suggestion": suggestion_color
        }

        for issue in review.issues:
            severity = issue.get("severity", "suggestion")
            color = severity_colors.get(severity, suggestion_color)

            issue_style = ParagraphStyle(
                "issue", fontSize=11, textColor=color,
                fontName="Helvetica-Bold", spaceAfter=4
            )
            fix_style = ParagraphStyle(
                "fix", fontSize=10, textColor=colors.darkgrey,
                spaceAfter=12, leftIndent=10
            )

            line_info = f" (Line {issue['line']})" if issue.get('line', 0) > 0 else ""
            story.append(Paragraph(f"[{severity.upper()}]{line_info} {issue.get('message', '')}", issue_style))
            story.append(Paragraph(f"Fix: {issue.get('fix', '')}", fix_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()