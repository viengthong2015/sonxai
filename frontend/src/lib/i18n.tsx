import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Language, Localized } from './types';

const STORAGE_KEY = 'sonxai_lang';
export const SOURCE_LANG = 'en';

/**
 * Fixed interface text (content text comes from the CMS). English is the source; Lao ships
 * built in. Administrators can translate these for any language on the Languages screen,
 * and can override the built-in Lao wording too.
 */
export const BUILTIN_UI = {
  en: {
    dashboard: 'Dashboard',
    apply_title: 'Apply for Admission',
    parent_name: 'Parent / Guardian Name',
    parent_placeholder: 'e.g. Somchai Soukhaseum',
    phone: 'Contact Phone Number',
    child_name: "Child's Name",
    grade: "Child's Grade Level",
    message: 'Message (optional)',
    submit: 'Submit Application Request',
    submitting: 'Sending…',
    thanks: 'Thank you! Your request has been submitted successfully.',
    learn_more: 'Learn More',
    not_found: 'Page not found',
    not_found_text: 'The page you are looking for does not exist or has been moved.',
    back_home: 'Back to home',
    coming_soon: 'Our website is being prepared',
    coming_soon_text: 'Please check back soon.',
    load_error: 'We could not load this page. Please try again.',
    retry: 'Try again',
    preview_disabled: 'Forms are disabled in preview mode.',
    close: 'Close',
    toggle_nav: 'Toggle navigation',
  },
  lo: {
    dashboard: 'ແຜງຄວບຄຸມ',
    apply_title: 'ສະໝັກເຂົ້າຮຽນ',
    parent_name: 'ຊື່ ພໍ່ແມ່ / ຜູ້ປົກຄອງ',
    parent_placeholder: 'ຕົວຢ່າງ: ສົມໃຈ ສຸກຂະເສີມ',
    phone: 'ເບີໂທຕິດຕໍ່',
    child_name: 'ຊື່ຂອງເດັກ',
    grade: 'ຊັ້ນຮຽນຂອງເດັກ',
    message: 'ຂໍ້ຄວາມ (ບໍ່ບັງຄັບ)',
    submit: 'ສົ່ງຄຳຮ້ອງສະໝັກ',
    submitting: 'ກຳລັງສົ່ງ…',
    thanks: 'ຂອບໃຈ! ຄຳຮ້ອງຂອງທ່ານຖືກສົ່ງສຳເລັດແລ້ວ.',
    learn_more: 'ອ່ານເພີ່ມເຕີມ',
    not_found: 'ບໍ່ພົບໜ້ານີ້',
    not_found_text: 'ໜ້າທີ່ທ່ານຊອກຫາບໍ່ມີ ຫຼື ຖືກຍ້າຍໄປແລ້ວ.',
    back_home: 'ກັບໄປໜ້າຫຼັກ',
    coming_soon: 'ເວັບໄຊຂອງພວກເຮົາກຳລັງກະກຽມ',
    coming_soon_text: 'ກະລຸນາກັບມາເບິ່ງໃໝ່ໃນໄວໆນີ້.',
    load_error: 'ບໍ່ສາມາດໂຫຼດໜ້ານີ້ໄດ້. ກະລຸນາລອງໃໝ່.',
    retry: 'ລອງໃໝ່',
    preview_disabled: 'ແບບຟອມຖືກປິດໃນໂໝດເບິ່ງຕົວຢ່າງ.',
    close: 'ປິດ',
    toggle_nav: 'ເປີດ/ປິດ ເມນູ',
  },
} as const;

export type UiKey = keyof (typeof BUILTIN_UI)['en'];
export const UI_KEYS = Object.keys(BUILTIN_UI.en) as UiKey[];

/** Built-in wording for a language, if any (used as a starting point when translating). */
export function builtinUi(lang: Lang, key: UiKey): string {
  return (BUILTIN_UI as Record<string, Partial<Record<UiKey, string>>>)[lang]?.[key] ?? '';
}

export const DEFAULT_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', short: 'EN', enabled: true },
  { code: 'lo', name: 'ພາສາລາວ', short: 'ລາວ', enabled: true },
];

interface LangConfig {
  languages: Language[];
  ui: Record<string, Record<string, string>>;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Languages the visitor can switch between. */
  languages: Language[];
  /** Called by the site layout once the published settings are loaded. */
  setConfig: (c: LangConfig) => void;
  /** Text in the current language, falling back to English when it is not translated. */
  t: (v: Localized | string | undefined | null) => string;
  ui: (key: UiKey) => string;
}

const Ctx = createContext<LangCtx | null>(null);

function savedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) || SOURCE_LANG;
  } catch {
    return SOURCE_LANG;
  }
}

/** Current language → English → any language that has text. */
export function pickLocalized(v: Localized | string | undefined | null, lang: Lang): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const own = v[lang];
  if (own && own.trim()) return own;
  const en = v[SOURCE_LANG];
  if (en && en.trim()) return en;
  return Object.values(v).find((x) => typeof x === 'string' && x.trim()) ?? '';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(savedLang);
  const [config, setConfigState] = useState<LangConfig>({ languages: DEFAULT_LANGUAGES, ui: {} });
  const [configured, setConfigured] = useState(false);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setConfig = useCallback((c: LangConfig) => {
    setConfigState(c);
    setConfigured(true);
  }, []);

  // Once the site's real language list is known, a language it does not offer falls back to English.
  useEffect(() => {
    if (configured && !config.languages.some((l) => l.code === lang)) setLangState(SOURCE_LANG);
  }, [configured, config.languages, lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      languages: config.languages,
      setConfig,
      t: (v) => pickLocalized(v, lang),
      ui: (key) => config.ui[lang]?.[key]?.trim() || builtinUi(lang, key) || BUILTIN_UI.en[key],
    }),
    [lang, setLang, config, setConfig],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
