import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DEFAULT_LANGUAGES, SOURCE_LANG } from '../lib/i18n';
import type { BlockData, Language } from '../lib/types';

/** Draft site settings (shared cache with the Settings and Languages screens). */
export function useDraftSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => api.get<BlockData>('/admin/settings') });
}

/** Every language an editor can write in, including ones not yet shown on the website. */
export function useEditLanguages(): Language[] {
  const q = useDraftSettings();
  const langs = q.data?.languages as Language[] | undefined;
  return langs?.length ? langs : DEFAULT_LANGUAGES;
}

export function useLanguageName(code: string): string {
  const langs = useEditLanguages();
  return langs.find((l) => l.code === code)?.name ?? code;
}

export const isSource = (code: string) => code === SOURCE_LANG;

/** Common languages offered as one-click suggestions when adding a language. */
export const LANGUAGE_SUGGESTIONS: Language[] = [
  { code: 'th', name: 'ภาษาไทย', short: 'ไทย', enabled: false },
  { code: 'vi', name: 'Tiếng Việt', short: 'VI', enabled: false },
  { code: 'zh', name: '中文', short: '中文', enabled: false },
  { code: 'fr', name: 'Français', short: 'FR', enabled: false },
  { code: 'km', name: 'ភាសាខ្មែរ', short: 'ខ្មែរ', enabled: false },
  { code: 'ko', name: '한국어', short: '한국어', enabled: false },
  { code: 'ja', name: '日本語', short: '日本語', enabled: false },
];
