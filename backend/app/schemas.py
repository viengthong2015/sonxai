import re
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, model_validator

from .sanitize import ContentError, safe_url

# Language codes such as "en", "lo", "th", "zh", "pt-br" (lowercase BCP 47-style).
LANG_CODE_RE = re.compile(r"^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$")
SOURCE_LANG = "en"

BLOCK_TYPES = (
    "hero",
    "page_header",
    "stats",
    "cards",
    "cta",
    "rich_text",
    "image_text",
    "partners",
    "enrollment_form",
)
BlockType = Literal[
    "hero", "page_header", "stats", "cards", "cta", "rich_text", "image_text",
    "partners", "enrollment_form",
]
APPLICATION_STATUSES = ("new", "contacted", "enrolled", "archived")

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def _localized(value: dict[str, str]) -> dict[str, str]:
    """A short text in several languages: {"en": "...", "lo": "...", "th": "..."}."""
    if len(value) > 30:
        raise ValueError("Too many languages.")
    out: dict[str, str] = {}
    for code, text in value.items():
        if not LANG_CODE_RE.match(code):
            raise ValueError(f"'{code}' is not a valid language code.")
        text = text.strip()
        if len(text) > 300:
            raise ValueError(f"The {code} text is too long (max 300 characters).")
        out[code] = text
    return out


LocalizedText = Annotated[dict[str, str], AfterValidator(_localized)]


# ---------------------------------------------------------------- auth / users
def _check_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if len(v.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes.")
    return v


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=200)


class UserOut(ORMModel):
    id: int
    username: str
    full_name: str
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.\-]+$")
    full_name: str = Field(default="", max_length=120)
    password: str

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return _check_password(v)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    password: str | None = None

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str | None) -> str | None:
        return None if v in (None, "") else _check_password(v)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _pw(cls, v: str) -> str:
        return _check_password(v)


# ---------------------------------------------------------------- menus
class MenuIn(BaseModel):
    slug: str = Field(min_length=1, max_length=80, pattern=SLUG_PATTERN)
    label: LocalizedText
    menu_type: Literal["page", "link"] = "page"
    url: str | None = Field(default=None, max_length=500)
    open_in_new_tab: bool = False
    is_home: bool = False
    is_visible: bool = True
    show_in_nav: bool = True
    meta_description: LocalizedText = Field(default_factory=dict)

    @model_validator(mode="after")
    def _check(self) -> "MenuIn":
        if not any(self.label.values()):
            raise ValueError("A menu label is required.")
        if self.menu_type == "link":
            if not self.url:
                raise ValueError("A link menu needs a URL.")
            try:
                self.url = safe_url(self.url, "url")
            except ContentError as e:
                raise ValueError(str(e)) from e
            self.is_home = False
        else:
            self.url = None
        return self


class MenuOut(ORMModel):
    id: int
    slug: str
    label: dict[str, Any]
    menu_type: str
    url: str | None
    open_in_new_tab: bool
    is_home: bool
    is_visible: bool
    show_in_nav: bool
    sort_order: int
    meta_description: dict[str, Any]
    block_count: int = 0
    updated_at: datetime


class ReorderIn(BaseModel):
    ids: list[int] = Field(max_length=500)


# ---------------------------------------------------------------- blocks
class BlockCreate(BaseModel):
    block_type: BlockType
    data: dict[str, Any] = Field(default_factory=dict)
    is_visible: bool = True
    position: int | None = Field(default=None, ge=0)


class BlockUpdate(BaseModel):
    data: dict[str, Any] | None = None
    is_visible: bool | None = None


class BlockOut(ORMModel):
    id: int
    menu_id: int
    block_type: str
    data: dict[str, Any]
    is_visible: bool
    sort_order: int
    updated_at: datetime


# ---------------------------------------------------------------- publishing
class PublishIn(BaseModel):
    note: str = Field(default="", max_length=255)


class PublicationOut(BaseModel):
    id: int
    note: str
    published_at: datetime
    published_by: str | None
    page_count: int
    is_live: bool


# ---------------------------------------------------------------- applications
class ApplicationCreate(BaseModel):
    parent_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=40, pattern=r"^[0-9+()\-\s.]+$")
    child_name: str = Field(default="", max_length=120)
    grade: str = Field(default="", max_length=80)
    message: str = Field(default="", max_length=2000)
    website: str = Field(default="", max_length=200)  # honeypot, must stay empty

    @field_validator("parent_name", "phone", "child_name", "grade", "message")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class ApplicationOut(ORMModel):
    id: int
    parent_name: str
    phone: str
    child_name: str
    grade: str
    message: str
    status: str
    admin_notes: str
    created_at: datetime
    updated_at: datetime


class ApplicationUpdate(BaseModel):
    status: Literal["new", "contacted", "enrolled", "archived"] | None = None
    admin_notes: str | None = Field(default=None, max_length=5000)


class ApplicationList(BaseModel):
    items: list[ApplicationOut]
    total: int


# ---------------------------------------------------------------- media
class MediaOut(ORMModel):
    id: int
    url: str
    original_name: str
    content_type: str
    size: int
    created_at: datetime
