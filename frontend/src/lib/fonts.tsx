/**
 * Per-language fonts.
 *
 * Each language may have an uploaded font. <LanguageFonts> loads them and applies each one to
 * everything written in that language, using the CSS :lang() selector:
 *  - the public site sets <html lang> to the visitor's language, so the whole site switches font;
 *  - the admin panel sets lang on its root to the admin language;
 *  - single elements marked lang="…" (translation boxes, language names) use their own font.
 * Icons (Font Awesome), code and font previews ([data-font-preview]) keep their own fonts.
 */
import type { Language } from './types';

const CODE_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;
const FORMATS = new Set(['woff2', 'woff', 'truetype', 'opentype']);

export const fontUrl = (id: number) => `/api/public/fonts/${id}`;
export const fontFamilyFor = (code: string) => `sx-lang-${code}`;

/** CSS that loads one font file under a family name. */
export function fontFaceCss(family: string, id: number, format: string): string {
  return `@font-face{font-family:"${family}";src:url("${fontUrl(id)}") format("${format}");font-display:swap;}`;
}

function languageCss(l: Language): string {
  if (!l.font_id || !Number.isInteger(l.font_id) || !CODE_RE.test(l.code) || !FORMATS.has(l.font_format ?? '')) return '';
  const family = fontFamilyFor(l.code);
  return (
    fontFaceCss(family, l.font_id, l.font_format!) +
    `:lang(${l.code}):not(i):not([class*="fa-"]):not(code):not(pre):not(kbd):not(samp):not([data-font-preview])` +
    `{font-family:"${family}",'Noto Sans Lao',system-ui,sans-serif !important;}`
  );
}

export function LanguageFonts({ languages }: { languages: Language[] | undefined }) {
  const css = (languages ?? []).map(languageCss).join('\n');
  return css ? <style data-language-fonts="">{css}</style> : null;
}
