from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, LanguageFont
from ..schemas import ApplicationCreate
from ..security import application_limiter, client_ip
from ..services import latest_publication, page_payload, site_payload

router = APIRouter(prefix="/api/public", tags=["public"])


def _live_snapshot(db: Session):
    pub = latest_publication(db)
    if pub is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "The website has not been published yet."
        )
    return pub


@router.get("/site")
def get_site(response: Response, db: Session = Depends(get_db)):
    pub = _live_snapshot(db)
    response.headers["Cache-Control"] = "no-cache"
    return site_payload(pub.snapshot, pub.published_at)


@router.get("/home")
def get_home(response: Response, db: Session = Depends(get_db)):
    page = page_payload(_live_snapshot(db).snapshot, None)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found.")
    response.headers["Cache-Control"] = "no-cache"
    return page


@router.get("/pages/{slug}")
def get_page(slug: str, response: Response, db: Session = Depends(get_db)):
    page = page_payload(_live_snapshot(db).snapshot, slug)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found.")
    response.headers["Cache-Control"] = "no-cache"
    return page


@router.post("/applications", status_code=status.HTTP_201_CREATED)
def submit_application(payload: ApplicationCreate, request: Request, db: Session = Depends(get_db)):
    key = f"apply:{client_ip(request)}"
    if application_limiter.is_limited(key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many requests. Please try again in a few minutes.",
        )
    application_limiter.hit(key)
    if payload.website:  # honeypot filled in: silently drop the bot submission
        return {"ok": True}
    db.add(
        Application(
            parent_name=payload.parent_name,
            phone=payload.phone,
            child_name=payload.child_name,
            grade=payload.grade,
            message=payload.message,
        )
    )
    db.commit()
    return {"ok": True}


@router.get("/fonts/{font_id}")
def get_font(font_id: int, db: Session = Depends(get_db)):
    """A language font file. Rows never change, so browsers may cache it for a year."""
    font = db.get(LanguageFont, font_id)
    if font is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Font not found.")
    return Response(
        content=font.data,
        media_type=font.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
