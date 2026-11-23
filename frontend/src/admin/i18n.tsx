/**
 * Admin-panel translations.
 *
 * Every piece of admin wording is written in English and passed through `at()`:
 *   at('Publish')                         -> translated text, or English if not translated
 *   at('Delete “{name}”?', { name })      -> with placeholders
 * Texts defined outside components (menus, field labels) are marked with `msg()` and
 * translated where they are displayed. `npm run i18n:extract` collects every marked text
 * into catalog.json, which the "Admin panel text" screen lists for translators.
 */
import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { api, setMessageTranslator } from '../lib/api';

export type Vars = Record<string, string | number>;
export type AT = (english: string, vars?: Vars) => string;

const STORAGE_KEY = 'sonxai_admin_lang';

/** Marks a text for translation without translating it (for data defined outside components). */
export const msg = (english: string) => english;

export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const identity: AT = (s, vars) => fill(s, vars);

export interface AdminLanguage {
  code: string;
  name: string;
  short: string;
}

interface Ctx {
  lang: string;
  setLang: (code: string) => void;
  languages: AdminLanguage[];
  at: AT;
  /** BCP 47 locale for dates, falling back to English when the browser does not know the language. */
  locale: string;
}

const AdminI18nCtx = createContext<Ctx | null>(null);

function savedLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(savedLang);
  const languages = useQuery({
    queryKey: ['admin-ui', 'languages'],
    queryFn: () => api.get<AdminLanguage[]>('/admin-ui/languages'),
    staleTime: 5 * 60_000,
  });
  const strings = useQuery({
    queryKey: ['admin-ui', 'strings', lang],
    queryFn: () => api.get<Record<string, string>>(`/admin-ui/strings/${encodeURIComponent(lang)}`),
    enabled: lang !== 'en',
    staleTime: 5 * 60_000,
  });

  const setLang = useCallback((code: string) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // A language that was removed falls back to English.
  useEffect(() => {
    if (languages.data && !languages.data.some((l) => l.code === lang)) setLangState('en');
  }, [languages.data, lang]);

  const at = useMemo<AT>(() => {
    const table = lang === 'en' ? null : strings.data;
    if (!table) return identity;
    return (s, vars) => fill(table[s]?.trim() || s, vars);
  }, [lang, strings.data]);

  // Server messages ("Invalid username or password.") use the same translations.
  useEffect(() => {
    setMessageTranslator(lang === 'en' ? null : (s) => at(s));
    return () => setMessageTranslator(null);
  }, [at, lang]);

  const locale = useMemo(() => {
    try {
      return Intl.DateTimeFormat.supportedLocalesOf([lang]).length ? lang : 'en';
    } catch {
      return 'en';
    }
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, languages: languages.data ?? [{ code: 'en', name: 'English', short: 'EN' }], at, locale }),
    [lang, setLang, languages.data, at, locale],
  );
  return <AdminI18nCtx.Provider value={value}>{children}</AdminI18nCtx.Provider>;
}

/** Route element that gives every admin screen (and the login page) its translations. */
export function AdminI18nOutlet() {
  return (
    <AdminI18nProvider>
      <Outlet />
    </AdminI18nProvider>
  );
}

export function useAdminI18n(): Ctx {
  return (
    useContext(AdminI18nCtx) ?? { lang: 'en', setLang: () => {}, languages: [], at: identity, locale: 'en' }
  );
}

/** The translate function for admin wording. Works (as English) even outside the provider. */
export function useAT(): AT {
  return useAdminI18n().at;
}

/** Compact picker for the admin panel language. */
export function AdminLangPicker({ className = '' }: { className?: string }) {
  const { lang, setLang, languages, at } = useAdminI18n();
  if (languages.length < 2) return null;
  return (
    <label className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-500 ${className}`}>
      <i className="fa-solid fa-language text-base" aria-hidden="true" />
      <span className="sr-only">{at('Admin language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
