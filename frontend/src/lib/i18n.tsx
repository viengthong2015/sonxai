import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Localized } from './types';

const STORAGE_KEY = 'sonxai_lang';

/** Fixed interface strings (content strings come from the CMS). */
const UI = {
  en: {
    language: 'English',
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
    language_changed: 'Language changed to English',
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
    visit: 'Visit website',
  },
  lo: {
    language: 'ພາສາລາວ',
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
    language_changed: 'ປ່ຽນເປັນພາສາລາວແລ້ວ',
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
    visit: 'ເຂົ້າເບິ່ງເວັບໄຊ',
  },
} as const;

export type UiKey = keyof (typeof UI)['en'];

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Pick the current language from a localized value, falling back to the other language. */
  t: (v: Localized | string | undefined | null) => string;
  ui: (key: UiKey) => string;
}

const Ctx = createContext<LangCtx | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'lo') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

export function pickLocalized(v: Localized | string | undefined | null, lang: Lang): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[lang] || v.en || v.lo || '';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'lo' ? 'lo' : 'en';
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (v) => pickLocalized(v, lang),
      ui: (key) => UI[lang][key],
    }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
