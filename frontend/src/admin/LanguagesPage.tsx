/**
 * Languages: add or remove the languages of the website (and show/hide or order them in the
 * language switch). Translating itself is done on the Translations screen.
 */
import { Link } from 'react-router-dom';
import { PageTitle } from './components/ui';
import { useAT } from './i18n';
import { ManageLanguages } from './languageTools';

export function LanguagesPage() {
  const at = useAT();
  return (
    <>
      <PageTitle
        title={at('Languages')}
        subtitle={at('Add or remove the languages of the website. English is the source language and cannot be removed.')}
        actions={
          <Link to="/admin/translations" className="btn-secondary">
            <i className="fa-solid fa-language" /> {at('Translations')}
          </Link>
        }
      />
      <ManageLanguages />
      <p className="text-sm text-slate-500">
        <i className="fa-solid fa-circle-info mr-1.5 text-slate-400" />
        {at('To translate the website into a language, open Translations and choose it in Translate into.')}
      </p>
    </>
  );
}
