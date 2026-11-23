from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Bumped on password change / forced logout to invalidate existing sessions.
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Menu(TimestampMixin, Base):
    """A top-navigation entry. `page` menus own an ordered list of content blocks."""

    __tablename__ = "menus"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    label: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)  # {"en": ..., "lo": ...}
    menu_type: Mapped[str] = mapped_column(String(16), default="page", nullable=False)  # page|link
    url: Mapped[str | None] = mapped_column(String(500))
    open_in_new_tab: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_home: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_in_nav: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    meta_description: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    blocks: Mapped[list["Block"]] = relationship(
        back_populates="menu",
        cascade="all, delete-orphan",
        order_by="(Block.sort_order, Block.id)",
        passive_deletes=True,
    )


class Block(TimestampMixin, Base):
    """A content section on a page (hero, cards, rich text, ...)."""

    __tablename__ = "blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    menu_id: Mapped[int] = mapped_column(
        ForeignKey("menus.id", ondelete="CASCADE"), index=True, nullable=False
    )
    block_type: Mapped[str] = mapped_column(String(32), nullable=False)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    menu: Mapped[Menu] = relationship(back_populates="blocks")


class SiteSetting(Base):
    """Single-row table (id=1) holding global site settings as JSON."""

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Publication(Base):
    """An immutable snapshot of menus + blocks + settings. The newest one is the live site."""

    __tablename__ = "publications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    note: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    published_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

    published_by: Mapped[User | None] = relationship()


class Application(TimestampMixin, Base):
    """Admission requests submitted from the public website."""

    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    child_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    grade: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="new", index=True, nullable=False)
    admin_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)


class AdminTranslation(Base):
    """Translations of the admin panel's own wording, per language: {"Publish": "..."}.
    Only staff see these, so they take effect on save (no publishing step)."""

    __tablename__ = "admin_translations"

    lang: Mapped[str] = mapped_column(String(20), primary_key=True)
    strings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Media(Base):
    __tablename__ = "media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
