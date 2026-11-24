import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SOURCE_LANG } from '../lib/i18n';
import { useAT } from './i18n';
import { useEditLanguages } from './languages';

/** Shown above an editor while writing in a language other than English. */
export function TranslatingBanner({ lang, children, translationsHref }: { lang: string; children?: ReactNode; translationsHref?: string }) {
  const at = useAT();
  const language = useEditLanguages().find((l) => l.code === lang);
  if (lang === SOURCE_LANG || !language) return null;
  return (
    <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center gap-2.5">
      <div className="flex items-start gap-2.5 flex-1">
        <i className="fa-solid fa-language mt-0.5" />
        <span>
          {at('Translating into {language}. Each field shows the English text above it. Fields you leave empty show English on the website.', {
            language: language.name,
          })}
          {!language.enabled && ` ${at('This language is hidden on the website until you turn it on under Languages.')}`}
        </span>
      </div>
      {children}
      <Link to={translationsHref ?? `/admin/translations?lang=${lang}`} className="btn-secondary !py-1.5 !text-xs shrink-0">
        <i className="fa-solid fa-language" /> {at('Open in Translations')}
      </Link>
    </div>
  );
}
