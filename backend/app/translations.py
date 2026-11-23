"""Language list validation, translation progress and machine translation."""

import html
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from .config import settings as app_settings
from .schemas import LANG_CODE_RE, SOURCE_LANG

MAX_LANGUAGES = 30
MT_CODE_RE = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$")


class LanguageError(ValueError):
    pass


def normalize_languages(settings: dict[str, Any]) -> dict[str, Any]:
    """Validate `languages` and `ui_strings` in site settings; English is always first and on."""
    langs = settings.get("languages")
    if langs is None:
        return settings
    if not isinstance(langs, list) or len(langs) > MAX_LANGUAGES:
        raise LanguageError(f"Languages must be a list of at most {MAX_LANGUAGES} items.")

    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for item in langs:
        if not isinstance(item, dict):
            raise LanguageError("Invalid language entry.")
        code = str(item.get("code", "")).strip().lower()
        name = str(item.get("name", "")).strip()
        short = str(item.get("short", "")).strip() or code.upper()
        if not LANG_CODE_RE.match(code):
            raise LanguageError(f"'{code}' is not a valid language code. Use a code like th, vi, zh or fr.")
        if code in seen:
            raise LanguageError(f"The language '{code}' is listed twice.")
        if not name or len(name) > 40 or len(short) > 8:
            raise LanguageError(f"Language '{code}': the name is required (max 40 characters) and the short label max 8.")
        # Optional code used by the auto-translate service when it differs (e.g. "mww" -> "hmn").
        mt_code = str(item.get("mt_code", "") or "").strip()
        if mt_code and not MT_CODE_RE.match(mt_code):
            raise LanguageError(f"Language '{code}': '{mt_code}' is not a valid auto-translate code (e.g. hmn, zh-CN).")
        seen.add(code)
        out.append({"code": code, "name": name, "short": short, "enabled": bool(item.get("enabled", True)), "mt_code": mt_code})

    source = next((lang for lang in out if lang["code"] == SOURCE_LANG), None)
    if source is None:
        raise LanguageError("English (en) is the source language and cannot be removed.")
    source["enabled"] = True
    out.remove(source)
    settings["languages"] = [source, *out]

    ui = settings.get("ui_strings") or {}
    if not isinstance(ui, dict):
        raise LanguageError("Invalid interface translations.")
    clean_ui: dict[str, dict[str, str]] = {}
    for code, strings in ui.items():
        if code not in seen or code == SOURCE_LANG or not isinstance(strings, dict):
            continue  # drop translations of removed languages
        clean_ui[code] = {
            str(k)[:64]: str(v).strip()[:300]
            for k, v in strings.items()
            if isinstance(v, str) and v.strip()
        }
    settings["ui_strings"] = clean_ui
    return settings


def _is_localized(obj: dict[str, Any]) -> bool:
    return isinstance(obj.get(SOURCE_LANG), str) and all(isinstance(k, str) and LANG_CODE_RE.match(k) for k in obj)


def _count(obj: Any, codes: list[str], acc: dict[str, Any]) -> None:
    """Walk content and count texts that exist in English, and how many each language has."""
    if isinstance(obj, dict):
        if _is_localized(obj):
            if obj[SOURCE_LANG].strip():
                acc["total"] += 1
                for c in codes:
                    v = obj.get(c)
                    if isinstance(v, str) and v.strip():
                        acc["filled"][c] += 1
            return
        for v in obj.values():
            _count(v, codes, acc)
    elif isinstance(obj, list):
        for v in obj:
            _count(v, codes, acc)


def translation_progress(snapshot: dict[str, Any], languages: list[dict[str, Any]]) -> dict[str, Any]:
    codes = [lang["code"] for lang in languages if lang["code"] != SOURCE_LANG]

    def tally(obj: Any) -> dict[str, Any]:
        acc = {"total": 0, "filled": {c: 0 for c in codes}}
        _count(obj, codes, acc)
        return acc

    items = []
    for m in snapshot.get("menus", []):
        label = m.get("label") or {}
        content = {"label": label, "meta": m.get("meta_description") or {}, "blocks": [b.get("data") for b in m.get("blocks", [])]}
        items.append({
            "kind": "menu",
            "id": m["id"],
            "menu_type": m.get("menu_type", "page"),
            "title": label.get(SOURCE_LANG) or m.get("slug"),
            **tally(content),
        })
    settings = {k: v for k, v in (snapshot.get("settings") or {}).items() if k not in ("languages", "ui_strings")}
    items.append({"kind": "settings", "id": None, "menu_type": None, "title": "Site settings", **tally(settings)})

    totals = {"total": sum(i["total"] for i in items), "filled": {c: sum(i["filled"][c] for i in items) for c in codes}}
    return {"languages": codes, "totals": totals, "items": items}


# ---------------------------------------------------------------- machine translation
class TranslateError(Exception):
    pass


def mt_available() -> bool:
    return bool((app_settings.google_translate_api_key or "").strip())


def machine_translate(texts: list[str], target: str, fmt: str = "text") -> list[str]:
    """Translate English texts with Google Cloud Translation v2. Runs in a worker thread."""
    if not mt_available():
        raise TranslateError("Auto-translate is not set up. Add GOOGLE_TRANSLATE_API_KEY to backend/.env.")
    results: list[str] = []
    # Google accepts up to 128 segments per request; keep requests modest in size too.
    batch: list[str] = []
    size = 0

    def flush() -> None:
        nonlocal batch, size
        if not batch:
            return
        body = urllib.parse.urlencode(
            [("q", t) for t in batch] + [("source", SOURCE_LANG), ("target", target), ("format", fmt)]
        ).encode()
        req = urllib.request.Request(
            app_settings.google_translate_url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Goog-Api-Key": (app_settings.google_translate_api_key or "").strip(),
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode("utf-8"))["error"]["message"]
            except Exception:  # noqa: BLE001
                msg = f"HTTP {e.code}"
            raise TranslateError(f"Google Translate: {msg}") from e
        except (urllib.error.URLError, TimeoutError) as e:
            raise TranslateError("Could not reach Google Translate. Check the server's internet connection.") from e
        for item in data.get("data", {}).get("translations", []):
            text = item.get("translatedText", "")
            # Plain-text results can still contain HTML entities such as &#39;.
            results.append(html.unescape(text) if fmt == "text" else text)
        batch, size = [], 0

    for t in texts:
        if len(batch) >= 100 or size + len(t) > 25_000:
            flush()
        batch.append(t)
        size += len(t)
    flush()
    if len(results) != len(texts):
        raise TranslateError("Google Translate returned an unexpected response.")
    return results
