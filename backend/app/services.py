"""Draft/publish logic.

Administrators edit the *draft* tables (menus, blocks, site_settings). Publishing freezes
the draft into an immutable JSON snapshot in `publications`; the public API only ever
reads the newest snapshot. This gives atomic publishing, preview, change detection and
rollback with very little machinery.
"""

from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from .models import Block, Menu, Publication, SiteSetting

SNAPSHOT_VERSION = 1

DEFAULT_SETTINGS: dict[str, Any] = {
    # Website languages. English is the source language and the fallback for missing text.
    "languages": [
        {"code": "en", "name": "English", "short": "EN", "enabled": True},
        {"code": "lo", "name": "ພາສາລາວ", "short": "ລາວ", "enabled": True},
    ],
    # Translations of the fixed interface text, per language: {"th": {"submit": "..."}}
    "ui_strings": {},
    "site_name": {"en": "Sonxai", "lo": "ສອນໄຊ"},
    "site_tagline": {"en": "Primary School", "lo": "ໂຮງຮຽນປະຖົມ"},
    "logo_icon": "fa-solid fa-graduation-cap",
    "logo_image_url": "/logo.png",
    "footer_name": {"en": "Sonxai Primary School", "lo": "ໂຮງຮຽນປະຖົມ ສອນໄຊ"},
    "footer_text": {
        "en": "All rights reserved. Empowering future leaders with care.",
        "lo": "ສະຫງວນລິຂະສິດ. ສ້າງຜູ້ນຳໃນອະນາຄົດດ້ວຍຄວາມເອົາໃຈໃສ່.",
    },
    "contact_email": "",
    "contact_phone": "",
    "contact_address": {"en": "", "lo": ""},
    "facebook_url": "",
    "youtube_url": "",
    "show_dashboard_button": True,
    "dashboard_label": {"en": "Dashboard", "lo": "ແຜງຄວບຄຸມ"},
    "apply_title": {"en": "Apply for Admission", "lo": "ສະໝັກເຂົ້າຮຽນ"},
    "apply_subtitle": {
        "en": "Fill out the quick form below to request an enrollment pack.",
        "lo": "ກະລຸນາຕື່ມແບບຟອມລຸ່ມນີ້ ເພື່ອຂໍຮັບເອກະສານການລົງທະບຽນ.",
    },
    "grades": [
        {"label": {"en": "Kindergarten / Prep", "lo": "ອະນຸບານ / ກຽມປະຖົມ"}},
        {"label": {"en": "Grade 1", "lo": "ປ.1"}},
        {"label": {"en": "Grade 2", "lo": "ປ.2"}},
        {"label": {"en": "Grade 3", "lo": "ປ.3"}},
        {"label": {"en": "Grade 4", "lo": "ປ.4"}},
        {"label": {"en": "Grade 5", "lo": "ປ.5"}},
    ],
    "meta_description": {
        "en": "Sonxai Primary School: where every child learns, grows and shines.",
        "lo": "ໂຮງຮຽນປະຖົມ ສອນໄຊ: ບ່ອນທີ່ເດັກນ້ອຍທຸກຄົນໄດ້ຮຽນຮູ້, ເຕີບໃຫຍ່ ແລະ ໂດດເດັ່ນ.",
    },
}


# ---------------------------------------------------------------- settings
def get_settings_row(db: Session) -> SiteSetting:
    row = db.get(SiteSetting, 1)
    if row is None:
        row = SiteSetting(id=1, data=dict(DEFAULT_SETTINGS))
        db.add(row)
        db.flush()
    return row


def effective_settings(data: dict[str, Any] | None) -> dict[str, Any]:
    return {**DEFAULT_SETTINGS, **(data or {})}


# ---------------------------------------------------------------- snapshots
def _block_dict(b: Block) -> dict[str, Any]:
    return {
        "id": b.id,
        "block_type": b.block_type,
        "data": b.data or {},
        "is_visible": b.is_visible,
        "sort_order": b.sort_order,
    }


def _menu_dict(m: Menu) -> dict[str, Any]:
    return {
        "id": m.id,
        "slug": m.slug,
        "label": m.label or {},
        "menu_type": m.menu_type,
        "url": m.url,
        "open_in_new_tab": m.open_in_new_tab,
        "is_home": m.is_home,
        "is_visible": m.is_visible,
        "show_in_nav": m.show_in_nav,
        "sort_order": m.sort_order,
        "meta_description": m.meta_description or {},
        "blocks": [_block_dict(b) for b in m.blocks],
    }


def build_snapshot(db: Session) -> dict[str, Any]:
    menus = db.scalars(
        select(Menu).options(selectinload(Menu.blocks)).order_by(Menu.sort_order, Menu.id)
    ).all()
    return {
        "version": SNAPSHOT_VERSION,
        "settings": get_settings_row(db).data or {},
        "menus": [_menu_dict(m) for m in menus],
    }


def latest_publication(db: Session) -> Publication | None:
    return db.scalars(select(Publication).order_by(Publication.id.desc()).limit(1)).first()


def _label(m: dict[str, Any]) -> str:
    lbl = m.get("label") or {}
    return lbl.get("en") or lbl.get("lo") or m.get("slug", "")


def diff_snapshots(live: dict[str, Any] | None, draft: dict[str, Any]) -> dict[str, Any]:
    if live is None:
        return {
            "has_changes": True,
            "never_published": True,
            "added": [_label(m) for m in draft["menus"]],
            "removed": [],
            "modified": [],
            "settings_changed": True,
            "order_changed": False,
        }
    live_by_id = {m["id"]: m for m in live.get("menus", [])}
    draft_by_id = {m["id"]: m for m in draft["menus"]}
    added = [_label(m) for i, m in draft_by_id.items() if i not in live_by_id]
    removed = [_label(m) for i, m in live_by_id.items() if i not in draft_by_id]

    def strip_order(m: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in m.items() if k != "sort_order"}

    modified = [
        _label(m)
        for i, m in draft_by_id.items()
        if i in live_by_id and strip_order(m) != strip_order(live_by_id[i])
    ]
    common_draft = [m["id"] for m in draft["menus"] if m["id"] in live_by_id]
    common_live = [m["id"] for m in live.get("menus", []) if m["id"] in draft_by_id]
    order_changed = common_draft != common_live
    settings_changed = (live.get("settings") or {}) != (draft.get("settings") or {})
    return {
        "has_changes": bool(added or removed or modified or order_changed or settings_changed),
        "never_published": False,
        "added": added,
        "removed": removed,
        "modified": modified,
        "settings_changed": settings_changed,
        "order_changed": order_changed,
    }


def restore_snapshot(db: Session, snapshot: dict[str, Any]) -> None:
    """Replace the draft with the content of a snapshot (ids are preserved)."""
    db.execute(Block.__table__.delete())
    db.execute(Menu.__table__.delete())
    db.flush()
    for m in snapshot.get("menus", []):
        menu = Menu(
            id=m["id"],
            slug=m["slug"],
            label=m.get("label") or {},
            menu_type=m.get("menu_type", "page"),
            url=m.get("url"),
            open_in_new_tab=bool(m.get("open_in_new_tab")),
            is_home=bool(m.get("is_home")),
            is_visible=bool(m.get("is_visible", True)),
            show_in_nav=bool(m.get("show_in_nav", True)),
            sort_order=int(m.get("sort_order", 0)),
            meta_description=m.get("meta_description") or {},
        )
        db.add(menu)
        for b in m.get("blocks", []):
            db.add(
                Block(
                    id=b["id"],
                    menu_id=m["id"],
                    block_type=b["block_type"],
                    data=b.get("data") or {},
                    is_visible=bool(b.get("is_visible", True)),
                    sort_order=int(b.get("sort_order", 0)),
                )
            )
    get_settings_row(db).data = snapshot.get("settings") or {}
    db.flush()
    # Explicit ids were inserted: move the sequences past them.
    for table in ("menus", "blocks"):
        db.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"
            )
        )


# ---------------------------------------------------------------- public payloads
def _visible_menus(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    return [m for m in snapshot.get("menus", []) if m.get("is_visible")]


def _find_home(menus: list[dict[str, Any]]) -> dict[str, Any] | None:
    pages = [m for m in menus if m.get("menu_type") == "page"]
    return next((m for m in pages if m.get("is_home")), pages[0] if pages else None)


def site_payload(snapshot: dict[str, Any], published_at: Any = None) -> dict[str, Any]:
    menus = _visible_menus(snapshot)
    home = _find_home(menus)
    nav = [
        {
            "slug": m["slug"],
            "label": m.get("label") or {},
            "menu_type": m.get("menu_type", "page"),
            "url": m.get("url"),
            "open_in_new_tab": bool(m.get("open_in_new_tab")),
            "is_home": home is not None and m["id"] == home["id"],
        }
        for m in menus
        if m.get("show_in_nav")
    ]
    return {
        "settings": effective_settings(snapshot.get("settings")),
        "nav": nav,
        "home_slug": home["slug"] if home else None,
        "published_at": published_at,
    }


def page_payload(snapshot: dict[str, Any], slug: str | None) -> dict[str, Any] | None:
    menus = _visible_menus(snapshot)
    home = _find_home(menus)
    if slug is None:
        menu = home
    else:
        menu = next(
            (m for m in menus if m["slug"] == slug and m.get("menu_type") == "page"), None
        )
    if menu is None:
        return None
    return {
        "slug": menu["slug"],
        "label": menu.get("label") or {},
        "meta_description": menu.get("meta_description") or {},
        "is_home": home is not None and menu["id"] == home["id"],
        "blocks": [
            {"id": b["id"], "block_type": b["block_type"], "data": b.get("data") or {}}
            for b in menu.get("blocks", [])
            if b.get("is_visible")
        ],
    }
