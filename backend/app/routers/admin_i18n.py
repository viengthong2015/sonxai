"""Admin-panel translations and machine translation."""

from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import AdminTranslation, User
from ..schemas import LANG_CODE_RE, SOURCE_LANG
from ..security import RateLimiter
from ..services import effective_settings, get_settings_row
from ..translations import TranslateError, machine_translate, mt_available

# Readable without signing in, so the login page can be shown in the staff member's language.
public_router = APIRouter(prefix="/api/admin-ui", tags=["admin i18n"])
router = APIRouter(prefix="/api/admin", tags=["admin i18n"], dependencies=[Depends(get_current_user)])

translate_limiter = RateLimiter(max_events=120, window_seconds=60)


def _languages(db: Session) -> list[dict]:
    return effective_settings(get_settings_row(db).data)["languages"]


def _check_lang(code: str) -> str:
    if not LANG_CODE_RE.match(code) or code == SOURCE_LANG:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown language.")
    return code


@public_router.get("/languages")
def admin_languages(db: Session = Depends(get_db)):
    """Languages a staff member can use the admin panel in."""
    return [{"code": l["code"], "name": l["name"], "short": l["short"]} for l in _languages(db)]


@public_router.get("/strings/{lang}")
def admin_strings(lang: str, db: Session = Depends(get_db)):
    row = db.get(AdminTranslation, _check_lang(lang))
    return row.strings if row else {}


@router.put("/admin-ui/strings/{lang}")
def save_admin_strings(lang: str, strings: dict = Body(...), db: Session = Depends(get_db)):
    _check_lang(lang)
    if lang not in {l["code"] for l in _languages(db)}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add this language on the Languages screen first.")
    if len(strings) > 3000:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Too many texts.")
    clean = {
        str(k)[:500]: v.strip()[:1000]
        for k, v in strings.items()
        if isinstance(k, str) and isinstance(v, str) and v.strip()
    }
    row = db.get(AdminTranslation, lang) or AdminTranslation(lang=lang)
    row.strings = clean
    db.add(row)
    db.commit()
    return row.strings


# ---------------------------------------------------------------- machine translation
class TranslateIn(BaseModel):
    target: str
    texts: list[str] = Field(max_length=400)
    format: Literal["text", "html"] = "text"

    @field_validator("texts")
    @classmethod
    def _size(cls, v: list[str]) -> list[str]:
        if sum(len(t) for t in v) > 150_000:
            raise ValueError("Too much text in one request.")
        return v


@router.get("/translate/status")
def translate_status():
    return {"available": mt_available(), "provider": "Google Translate"}


@router.post("/translate")
def translate(payload: TranslateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Translate English texts into one of the site's languages (or an admin-panel language)."""
    key = f"translate:{user.id}"
    if translate_limiter.is_limited(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many translation requests. Please wait a minute.")
    translate_limiter.hit(key)

    lang = next((l for l in _languages(db) if l["code"] == payload.target), None)
    if lang is None or lang["code"] == SOURCE_LANG:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a language from the Languages screen.")
    if not payload.texts:
        return {"translations": []}
    try:
        out = machine_translate(payload.texts, lang.get("mt_code") or lang["code"], payload.format)
    except TranslateError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e)) from e
    return {"translations": out}
