"""Server-side sanitisation of CMS content.

Everything an administrator saves is cleaned here before it hits the database, so the
public site never renders unsafe HTML or `javascript:` links even if an admin account
is compromised or a request is crafted by hand.
"""

import json
import re
from typing import Any

import nh3

ALLOWED_TAGS = {
    "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
    "h2", "h3", "h4", "blockquote", "code", "pre", "hr",
}
ALLOWED_ATTRIBUTES = {"a": {"href", "title", "target"}}
URL_SCHEMES = {"http", "https", "mailto", "tel"}

MAX_STRING = 50_000
MAX_LIST = 60
MAX_DEPTH = 8
MAX_JSON_BYTES = 300_000

_SCHEME_RE = re.compile(r"^([a-zA-Z][a-zA-Z0-9+.\-]*):")


class ContentError(ValueError):
    pass


def clean_html(value: str) -> str:
    return nh3.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=URL_SCHEMES,
        link_rel="noopener noreferrer",
    )


def safe_url(value: str, path: str = "url") -> str:
    v = (value or "").strip()
    if not v:
        return ""
    if len(v) > 1000:
        raise ContentError(f"{path}: URL is too long.")
    if any(ord(c) < 32 for c in v):
        raise ContentError(f"{path}: URL contains invalid characters.")
    if v.startswith("#") or (v.startswith("/") and not v.startswith("//")):
        return v
    m = _SCHEME_RE.match(v)
    if m and m.group(1).lower() in URL_SCHEMES:
        return v
    raise ContentError(
        f"{path}: '{v[:60]}' is not an allowed link. Use https://..., mailto:, tel:, "
        "a site path like /about, or an anchor like #section."
    )


def _is_html_key(key: str) -> bool:
    return key == "html" or key.endswith("_html")


def _is_url_key(key: str) -> bool:
    return key == "href" or key.endswith("url")


def _apply_leaf(value: Any, fn, path: str) -> Any:
    """Apply fn to a string or to each language of a localized {"en":..,"lo":..} dict."""
    if isinstance(value, str):
        return fn(value, path)
    if isinstance(value, dict):
        return {k: fn(v, f"{path}.{k}") if isinstance(v, str) else v for k, v in value.items()}
    return value


def _walk(value: Any, path: str, depth: int) -> Any:
    if depth > MAX_DEPTH:
        raise ContentError(f"{path}: content is nested too deeply.")
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if not isinstance(k, str) or len(k) > 64:
                raise ContentError(f"{path}: invalid field name.")
            child = f"{path}.{k}" if path else k
            if _is_html_key(k):
                out[k] = _apply_leaf(v, lambda s, p: clean_html(s), child)
            elif _is_url_key(k):
                out[k] = _apply_leaf(v, safe_url, child)
            else:
                out[k] = _walk(v, child, depth + 1)
        return out
    if isinstance(value, list):
        if len(value) > MAX_LIST:
            raise ContentError(f"{path}: too many items (max {MAX_LIST}).")
        return [_walk(v, f"{path}[{i}]", depth + 1) for i, v in enumerate(value)]
    if isinstance(value, str):
        if len(value) > MAX_STRING:
            raise ContentError(f"{path}: text is too long.")
        return value
    if value is None or isinstance(value, (bool, int, float)):
        return value
    raise ContentError(f"{path}: unsupported value.")


def sanitize_content(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ContentError("Content must be an object.")
    if len(json.dumps(data, ensure_ascii=False).encode("utf-8")) > MAX_JSON_BYTES:
        raise ContentError("Content is too large.")
    return _walk(data, "", 0)
