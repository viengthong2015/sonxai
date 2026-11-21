"""Admin endpoints for dashboard, site settings, applications, users and media."""

import uuid

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Application, Block, Media, Menu, User
from ..sanitize import ContentError, sanitize_content
from ..schemas import (
    ApplicationList,
    ApplicationOut,
    ApplicationUpdate,
    MediaOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from ..security import hash_password
from ..services import build_snapshot, diff_snapshots, effective_settings, get_settings_row, latest_publication

router = APIRouter(prefix="/api/admin", tags=["admin: site"], dependencies=[Depends(get_current_user)])


# ---------------------------------------------------------------- dashboard
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    live = latest_publication(db)
    diff = diff_snapshots(live.snapshot if live else None, build_snapshot(db))
    return {
        "menus": db.scalar(select(func.count(Menu.id))) or 0,
        "pages": db.scalar(select(func.count(Menu.id)).where(Menu.menu_type == "page")) or 0,
        "blocks": db.scalar(select(func.count(Block.id))) or 0,
        "applications_new": db.scalar(select(func.count(Application.id)).where(Application.status == "new")) or 0,
        "applications_total": db.scalar(select(func.count(Application.id))) or 0,
        "has_changes": diff["has_changes"],
        "last_published_at": live.published_at if live else None,
        "recent_applications": [
            ApplicationOut.model_validate(a)
            for a in db.scalars(select(Application).order_by(Application.id.desc()).limit(5))
        ],
    }


# ---------------------------------------------------------------- settings
@router.get("/settings")
def get_site_settings(db: Session = Depends(get_db)):
    row = get_settings_row(db)
    db.commit()
    return effective_settings(row.data)


@router.put("/settings")
def update_site_settings(data: dict = Body(...), db: Session = Depends(get_db)):
    try:
        clean = sanitize_content(data)
    except ContentError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e
    row = get_settings_row(db)
    row.data = clean
    db.commit()
    return effective_settings(row.data)


# ---------------------------------------------------------------- applications
def _get_application(db: Session, app_id: int) -> Application:
    app = db.get(Application, app_id)
    if app is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found.")
    return app


@router.get("/applications", response_model=ApplicationList)
def list_applications(
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Application)
    if status_filter:
        stmt = stmt.where(Application.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Application.parent_name.ilike(like),
                Application.child_name.ilike(like),
                Application.phone.ilike(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(stmt.order_by(Application.id.desc()).limit(limit).offset(offset)).all()
    return {"items": items, "total": total}


@router.patch("/applications/{app_id}", response_model=ApplicationOut)
def update_application(app_id: int, payload: ApplicationUpdate, db: Session = Depends(get_db)):
    app = _get_application(db, app_id)
    if payload.status is not None:
        app.status = payload.status
    if payload.admin_notes is not None:
        app.admin_notes = payload.admin_notes
    db.commit()
    db.refresh(app)
    return app


@router.delete("/applications/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(app_id: int, db: Session = Depends(get_db)):
    db.delete(_get_application(db, app_id))
    db.commit()


# ---------------------------------------------------------------- users
def _get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    exists = db.scalar(select(User.id).where(func.lower(User.username) == payload.username.lower()))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "That username is already taken.")
    user = User(
        username=payload.username,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(db, user_id)
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.is_active is not None:
        if user.id == current.id and not payload.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot deactivate your own account.")
        if user.is_active and not payload.is_active:
            user.token_version += 1
        user.is_active = payload.is_active
    if payload.password:
        if user.id == current.id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Use 'Change password' to change your own password."
            )
        user.password_hash = hash_password(payload.password)
        user.token_version += 1
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(db, user_id)
    if user.id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account.")
    db.delete(user)
    db.commit()


# ---------------------------------------------------------------- media
_IMAGE_SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"GIF87a", "image/gif", ".gif"),
    (b"GIF89a", "image/gif", ".gif"),
)


def _detect_image(head: bytes) -> tuple[str, str] | None:
    for sig, ctype, ext in _IMAGE_SIGNATURES:
        if head.startswith(sig):
            return ctype, ext
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


def _media_out(m: Media) -> MediaOut:
    return MediaOut(
        id=m.id,
        url=f"/uploads/{m.filename}",
        original_name=m.original_name,
        content_type=m.content_type,
        size=m.size,
        created_at=m.created_at,
    )


@router.get("/media", response_model=list[MediaOut])
def list_media(db: Session = Depends(get_db)):
    return [_media_out(m) for m in db.scalars(select(Media).order_by(Media.id.desc()).limit(200))]


@router.post("/media", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Images must be {settings.max_upload_mb} MB or smaller.")
    detected = _detect_image(content[:16])
    if detected is None:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only PNG, JPEG, GIF and WebP images are allowed.")
    ctype, ext = detected
    filename = f"{uuid.uuid4().hex}{ext}"
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    (settings.upload_dir / filename).write_bytes(content)
    media = Media(
        filename=filename,
        original_name=(file.filename or "")[:255],
        content_type=ctype,
        size=len(content),
        uploaded_by_id=user.id,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return _media_out(media)


@router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(media_id: int, db: Session = Depends(get_db)):
    media = db.get(Media, media_id)
    if media is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found.")
    path = settings.upload_dir / media.filename
    db.delete(media)
    db.commit()
    path.unlink(missing_ok=True)
