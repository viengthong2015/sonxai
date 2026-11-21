/** Client-side mirror of the server URL rules (defence in depth). */
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const v = url.trim();
  if (v.startsWith('#')) return true;
  if (v.startsWith('/') && !v.startsWith('//')) return true;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(v);
  return !!m && ALLOWED_SCHEMES.includes(m[1].toLowerCase());
}

/** A site path handled by the React router (not uploads / api). */
export function isInternalPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/uploads/') && !url.startsWith('/api/');
}

export function isExternal(url: string): boolean {
  return /^https?:/i.test(url);
}
