/**
 * Machine translation helpers (Google Translate via our API; the key never reaches the browser).
 * Only EMPTY translations are filled, so nothing a person has written is ever overwritten.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SOURCE_LANG } from '../lib/i18n';
import type { Block, BlockData, Menu } from '../lib/types';

const LANG_KEY = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;

export function useMachineTranslation() {
  const q = useQuery({
    queryKey: ['mt-status'],
    queryFn: () => api.get<{ available: boolean; provider: string }>('/admin/translate/status'),
    staleTime: 10 * 60_000,
  });
  return { available: !!q.data?.available, provider: q.data?.provider ?? 'Google Translate' };
}

export async function translateTexts(texts: string[], target: string, format: 'text' | 'html' = 'text'): Promise<string[]> {
  if (!texts.length) return [];
  const out: string[] = [];
  // Keep each request comfortably under the API limits.
  for (let i = 0; i < texts.length; i += 300) {
    const r = await api.post<{ translations: string[] }>('/admin/translate', { texts: texts.slice(i, i + 300), target, format });
    out.push(...r.translations);
  }
  return out;
}

/* ---------------------------------------------------------------- placeholders like {name} */
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function unescapeHtml(s: string) {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${s}`, 'text/html');
  return doc.body.textContent ?? s;
}

/** Translate short interface texts, keeping {placeholders} untouched. */
export async function translateUiTexts(texts: string[], target: string): Promise<string[]> {
  const protectedHtml = texts.map((t) => escapeHtml(t).replace(/\{(\w+)\}/g, '<span translate="no">{$1}</span>'));
  const result = await translateTexts(protectedHtml, target, 'html');
  return result.map((r) => unescapeHtml(r.replace(/<span translate="no">\s*(\{\w+\})\s*<\/span>/g, '$1')));
}

/* ---------------------------------------------------------------- content */
type Localized = Record<string, string>;
interface Slot {
  holder: Localized;
  html: boolean;
}

function isLocalized(v: unknown): v is Localized {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return typeof o[SOURCE_LANG] === 'string' && Object.keys(o).every((k) => LANG_KEY.test(k));
}

function collect(value: unknown, target: string, slots: Slot[], html: boolean) {
  if (Array.isArray(value)) {
    value.forEach((v) => collect(v, target, slots, html));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (isLocalized(value)) {
    const en = (value[SOURCE_LANG] ?? '').trim();
    const own = (value[target] ?? '').trim();
    if (en && !own) slots.push({ holder: value, html });
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    collect(v, target, slots, k === 'html' || k.endsWith('_html'));
  }
}

/** Fill every empty `target` translation inside `data` from English. Returns a new object. */
export async function fillTranslations<T>(data: T, target: string): Promise<{ result: T; count: number }> {
  const copy = structuredClone(data);
  const slots: Slot[] = [];
  collect(copy, target, slots, false);
  for (const html of [false, true]) {
    const group = slots.filter((s) => s.html === html);
    const translated = await translateTexts(group.map((s) => s.holder[SOURCE_LANG]), target, html ? 'html' : 'text');
    group.forEach((s, i) => (s.holder[target] = translated[i]));
  }
  return { result: copy, count: slots.length };
}

/** Translate a menu's label/description and all its blocks; saves changed items to the draft. */
export async function autoTranslateMenu(menu: Menu, target: string): Promise<number> {
  let count = 0;
  const meta = await fillTranslations({ label: menu.label, meta_description: menu.meta_description ?? {} }, target);
  if (meta.count) {
    await api.put(`/admin/menus/${menu.id}`, {
      slug: menu.slug,
      label: meta.result.label,
      menu_type: menu.menu_type,
      url: menu.url,
      open_in_new_tab: menu.open_in_new_tab,
      is_home: menu.is_home,
      is_visible: menu.is_visible,
      show_in_nav: menu.show_in_nav,
      meta_description: meta.result.meta_description,
    });
    count += meta.count;
  }
  if (menu.menu_type !== 'page') return count;
  const blocks = await api.get<Block[]>(`/admin/menus/${menu.id}/blocks`);
  for (const b of blocks) {
    const filled = await fillTranslations(b.data, target);
    if (filled.count) {
      await api.put(`/admin/blocks/${b.id}`, { data: filled.result });
      count += filled.count;
    }
  }
  return count;
}

/** Translate the site settings (school name, footer, form text…) and save them. */
export async function autoTranslateSettings(settings: BlockData, target: string): Promise<number> {
  const { languages, ui_strings, ...rest } = settings;
  const filled = await fillTranslations(rest, target);
  if (filled.count) await api.put('/admin/settings', { ...filled.result, languages, ui_strings });
  return filled.count;
}
