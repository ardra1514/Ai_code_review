from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.review import Review
from app.middleware.auth import get_current_user
from app.services.ai_service import get_ai_review
from app.services.code_analyzer import analyze_python_code
from app.services.github_service import fetch_github_file
from app.services.pdf_service import generate_review_pdf
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid
import secrets

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/review", tags=["review"])

class ReviewRequest(BaseModel):
    code: str
    language: str

class GithubReviewRequest(BaseModel):
    github_url: str


# ✅ 1. POST routes first
@router.post("/")
@limiter.limit("10/hour")
async def create_review(
    request: Request,
    body: ReviewRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    static_issues = []
    static_metrics = {}

    if body.language == "python":
        result = analyze_python_code(body.code)
        static_issues = result["static_issues"]
        static_metrics = result["metrics"]

    ai_result = get_ai_review(body.code, body.language, static_issues)
    all_issues = static_issues + ai_result.get("issues", [])

    review = Review(
        user_id=current_user.id,
        code=body.code,
        language=body.language,
        score=ai_result["score"],
        summary=ai_result["summary"],
        issues=all_issues,
        static_metrics=static_metrics
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return {"success": True, "data": review}


@router.post("/github")
async def review_github_file(
    body: GithubReviewRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        github_data = await fetch_github_file(body.github_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    code = github_data["code"]
    language = github_data["language"]

    static_issues = []
    static_metrics = {}
    if language == "python":
        result = analyze_python_code(code)
        static_issues = result["static_issues"]
        static_metrics = result["metrics"]

    ai_result = get_ai_review(code, language, static_issues)
    all_issues = static_issues + ai_result.get("issues", [])

    review = Review(
        user_id=current_user.id,
        code=code,
        language=language,
        score=ai_result["score"],
        summary=ai_result["summary"],
        issues=all_issues,
        static_metrics=static_metrics
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return {"success": True, "data": review, "filename": github_data["filename"]}


# ✅ 2. Specific GET string routes — BEFORE /{review_id}
@router.get("/history")
async def get_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    reviews = (
        db.query(Review)
        .filter(Review.user_id == current_user.id)
        .order_by(Review.created_at.desc())
        .limit(20)
        .all()
    )
    return {"success": True, "data": reviews}


@router.get("/stats")
async def get_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    reviews = db.query(Review).filter(Review.user_id == current_user.id).all()

    if not reviews:
        return {"success": True, "data": {
            "totalReviews": 0,
            "averageScore": 0,
            "scoreOverTime": [],
            "languagesUsed": {},
            "commonIssues": {"critical": 0, "warning": 0, "suggestion": 0}
        }}

    average_score = round(sum(r.score for r in reviews) / len(reviews))

    score_over_time = [
        {"date": r.created_at.strftime("%Y-%m-%d"), "score": r.score, "language": r.language}
        for r in sorted(reviews, key=lambda x: x.created_at)
    ]

    languages_used = {}
    for r in reviews:
        languages_used[r.language] = languages_used.get(r.language, 0) + 1

    common_issues = {"critical": 0, "warning": 0, "suggestion": 0}
    for r in reviews:
        for issue in (r.issues or []):
            severity = issue.get("severity", "")
            if severity in common_issues:
                common_issues[severity] += 1

    best_review = max(reviews, key=lambda x: x.score)
    worst_review = min(reviews, key=lambda x: x.score)

    return {
        "success": True,
        "data": {
            "totalReviews": len(reviews),
            "averageScore": average_score,
            "scoreOverTime": score_over_time,
            "languagesUsed": languages_used,
            "commonIssues": common_issues,
            "bestReview": {
                "id": str(best_review.id),
                "score": best_review.score,
                "language": best_review.language,
                "date": best_review.created_at.strftime("%Y-%m-%d")
            },
            "worstReview": {
                "id": str(worst_review.id),
                "score": worst_review.score,
                "language": worst_review.language,
                "date": worst_review.created_at.strftime("%Y-%m-%d")
            }
        }
    }


@router.get("/shared/{token}")
async def get_shared_review(token: str, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.share_token == token).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found or link expired")
    return {"success": True, "data": review}


# ✅ 3. Dynamic UUID routes — LAST
@router.post("/{review_id}/share")
async def generate_share_link(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if not review.share_token:
        review.share_token = secrets.token_urlsafe(16)
        db.commit()
        db.refresh(review)

    return {"success": True, "share_url": f"http://localhost:5173/shared/{review.share_token}"}


@router.get("/{review_id}/pdf")
async def export_pdf(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    pdf_bytes = generate_review_pdf(review)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=review-{review_id}.pdf"}
    )


@router.get("/{review_id}")
async def get_review(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    return {"success": True, "data": review}