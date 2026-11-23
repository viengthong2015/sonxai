"""Admin endpoints for menus, page blocks, preview and publishing."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import Block, Menu, Publication, User
from ..sanitize import ContentError, sanitize_content
from ..schemas import (
    BlockCreate,
    BlockOut,
    BlockUpdate,
    MenuIn,
    MenuOut,
    PublicationOut,
    PublishIn,
    ReorderIn,
)
from ..services import (
    build_snapshot,
    diff_snapshots,
    latest_publication,
    page_payload,
    restore_snapshot,
    site_payload,
)

router = APIRouter(prefix="/api/admin", tags=["admin: content"], dependencies=[Depends(get_current_user)])

RESERVED_SLUGS = {"admin", "api", "uploads", "assets", "preview", "static", "login"}


# ---------------------------------------------------------------- helpers
def _get_menu(db: Session, menu_id: int) -> Menu:
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Menu not found.")
    return menu


def _get_block(db: Session, block_id: int) -> Block:
    block = db.get(Block, block_id)
    if block is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Block not found.")
    return block


def _menu_out(menu: Menu, block_count: int) -> MenuOut:
    out = MenuOut.model_validate(menu)
    out.block_count = block_count
    return out


def _clean(data: dict) -> dict:
    try:
        return sanitize_content(data)
    except ContentError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e


def _validate_slug(db: Session, slug: str, exclude_id: int | None = None) -> None:
    if slug in RESERVED_SLUGS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"'{slug}' is a reserved slug.")
    q = select(Menu.id).where(Menu.slug == slug)
    if exclude_id is not None:
        q = q.where(Menu.id != exclude_id)
    if db.scalar(q) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"The slug '{slug}' is already used.")


def _apply_menu(menu: Menu, payload: MenuIn) -> None:
    menu.slug = payload.slug
    menu.label = payload.label
    menu.menu_type = payload.menu_type
    menu.url = payload.url
    menu.open_in_new_tab = payload.open_in_new_tab
    menu.is_home = payload.is_home
    menu.is_visible = payload.is_visible
    menu.show_in_nav = payload.show_in_nav
    menu.meta_description = payload.meta_description


def _clear_other_homes(db: Session, keep_id: int) -> None:
    db.execute(update(Menu).where(Menu.id != keep_id, Menu.is_home.is_(True)).values(is_home=False))


def _renumber_blocks(db: Session, menu_id: int, ordered: list[Block]) -> None:
    for i, b in enumerate(ordered):
        b.sort_order = i


# ---------------------------------------------------------------- menus
@router.get("/menus", response_model=list[MenuOut])
def list_menus(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Menu, func.count(Block.id))
        .outerjoin(Block, Block.menu_id == Menu.id)
        .group_by(Menu.id)
        .order_by(Menu.sort_order, Menu.id)
    ).all()
    return [_menu_out(m, c) for m, c in rows]


@router.get("/menus/{menu_id}", response_model=MenuOut)
def get_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = _get_menu(db, menu_id)
    count = db.scalar(select(func.count(Block.id)).where(Block.menu_id == menu_id)) or 0
    return _menu_out(menu, count)


@router.post("/menus", response_model=MenuOut, status_code=status.HTTP_201_CREATED)
def create_menu(payload: MenuIn, db: Session = Depends(get_db)):
    _validate_slug(db, payload.slug)
    menu = Menu()
    _apply_menu(menu, payload)
    menu.sort_order = (db.scalar(select(func.max(Menu.sort_order))) or 0) + 1
    db.add(menu)
    db.flush()
    if menu.is_home:
        _clear_other_homes(db, menu.id)
    db.commit()
    return _menu_out(menu, 0)


@router.put("/menus/{menu_id}", response_model=MenuOut)
def update_menu(menu_id: int, payload: MenuIn, db: Session = Depends(get_db)):
    menu = _get_menu(db, menu_id)
    _validate_slug(db, payload.slug, exclude_id=menu_id)
    _apply_menu(menu, payload)
    if menu.is_home:
        _clear_other_homes(db, menu.id)
    db.commit()
    return get_menu(menu_id, db)


@router.delete("/menus/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu(menu_id: int, db: Session = Depends(get_db)):
    db.delete(_get_menu(db, menu_id))
    db.commit()


@router.post("/menus/reorder", response_model=list[MenuOut])
def reorder_menus(payload: ReorderIn, db: Session = Depends(get_db)):
    menus = {m.id: m for m in db.scalars(select(Menu)).all()}
    if set(payload.ids) != set(menus) or len(payload.ids) != len(menus):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The id list must contain every menu exactly once.")
    for i, mid in enumerate(payload.ids):
        menus[mid].sort_order = i
    db.commit()
    return list_menus(db)


# ---------------------------------------------------------------- blocks
@router.get("/menus/{menu_id}/blocks", response_model=list[BlockOut])
def list_blocks(menu_id: int, db: Session = Depends(get_db)):
    return _get_menu(db, menu_id).blocks


@router.post("/menus/{menu_id}/blocks", response_model=BlockOut, status_code=status.HTTP_201_CREATED)
def create_block(menu_id: int, payload: BlockCreate, db: Session = Depends(get_db)):
    menu = _get_menu(db, menu_id)
    if menu.menu_type != "page":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only page menus can have content blocks.")
    block = Block(block_type=payload.block_type, data=_clean(payload.data), is_visible=payload.is_visible)
    ordered = list(menu.blocks)
    pos = len(ordered) if payload.position is None else min(payload.position, len(ordered))
    ordered.insert(pos, block)
    menu.blocks = ordered
    _renumber_blocks(db, menu_id, ordered)
    db.commit()
    return block


@router.put("/blocks/{block_id}", response_model=BlockOut)
def update_block(block_id: int, payload: BlockUpdate, db: Session = Depends(get_db)):
    block = _get_block(db, block_id)
    if payload.data is not None:
        block.data = _clean(payload.data)
    if payload.is_visible is not None:
        block.is_visible = payload.is_visible
    db.commit()
    return block


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(block_id: int, db: Session = Depends(get_db)):
    block = _get_block(db, block_id)
    menu = block.menu
    db.delete(block)
    db.flush()
    db.refresh(menu)
    _renumber_blocks(db, menu.id, list(menu.blocks))
    db.commit()


@router.post("/blocks/{block_id}/duplicate", response_model=BlockOut, status_code=status.HTTP_201_CREATED)
def duplicate_block(block_id: int, db: Session = Depends(get_db)):
    src = _get_block(db, block_id)
    menu = src.menu
    ordered = list(menu.blocks)
    copy = Block(block_type=src.block_type, data=dict(src.data or {}), is_visible=src.is_visible)
    ordered.insert(ordered.index(src) + 1, copy)
    menu.blocks = ordered
    _renumber_blocks(db, menu.id, ordered)
    db.commit()
    return copy


@router.post("/menus/{menu_id}/blocks/reorder", response_model=list[BlockOut])
def reorder_blocks(menu_id: int, payload: ReorderIn, db: Session = Depends(get_db)):
    menu = _get_menu(db, menu_id)
    by_id = {b.id: b for b in menu.blocks}
    if set(payload.ids) != set(by_id) or len(payload.ids) != len(by_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The id list must contain every block exactly once.")
    _renumber_blocks(db, menu_id, [by_id[i] for i in payload.ids])
    db.commit()
    db.refresh(menu)
    return menu.blocks


# ---------------------------------------------------------------- preview (draft)
@router.get("/preview/site")
def preview_site(db: Session = Depends(get_db)):
    return site_payload(build_snapshot(db), None)


@router.get("/preview/home")
def preview_home(db: Session = Depends(get_db)):
    page = page_payload(build_snapshot(db), None)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found.")
    return page


@router.get("/preview/pages/{slug}")
def preview_page(slug: str, db: Session = Depends(get_db)):
    page = page_payload(build_snapshot(db), slug)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found.")
    return page


# ---------------------------------------------------------------- publishing
def _publisher_name(pub: Publication | None) -> str | None:
    if pub is None or pub.published_by is None:
        return None
    return pub.published_by.full_name or pub.published_by.username


@router.get("/publish/status")
def publish_status(db: Session = Depends(get_db)):
    live = latest_publication(db)
    diff = diff_snapshots(live.snapshot if live else None, build_snapshot(db))
    return {
        **diff,
        "last_published_at": live.published_at if live else None,
        "last_published_by": _publisher_name(live),
        "last_publication_id": live.id if live else None,
    }


@router.post("/publish")
def publish(payload: PublishIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pub = Publication(snapshot=build_snapshot(db), note=payload.note.strip(), published_by_id=user.id)
    db.add(pub)
    db.commit()
    return {"id": pub.id, "published_at": pub.published_at}


@router.get("/publications", response_model=list[PublicationOut])
def list_publications(db: Session = Depends(get_db)):
    pubs = db.scalars(
        select(Publication)
        .options(selectinload(Publication.published_by))
        .order_by(Publication.id.desc())
        .limit(50)
    ).all()
    live_id = pubs[0].id if pubs else None
    return [
        PublicationOut(
            id=p.id,
            note=p.note,
            published_at=p.published_at,
            published_by=_publisher_name(p),
            page_count=sum(1 for m in p.snapshot.get("menus", []) if m.get("menu_type") == "page"),
            is_live=p.id == live_id,
        )
        for p in pubs
    ]


@router.post("/publications/{pub_id}/restore")
def restore_publication(pub_id: int, db: Session = Depends(get_db)):
    pub = db.get(Publication, pub_id)
    if pub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Publication not found.")
    restore_snapshot(db, pub.snapshot)
    db.commit()
    return {"ok": True}
