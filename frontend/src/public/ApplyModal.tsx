import { useEffect } from 'react';
import { useLang } from '../lib/i18n';
import { ApplicationForm } from './ApplicationForm';
import { useSite } from './SiteContext';

export function ApplyModal() {
  const { applyOpen, closeApply, site } = useSite();
  const { t, ui } = useLang();

  useEffect(() => {
    if (!applyOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeApply();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [applyOpen, closeApply]);

  if (!applyOpen) return null;

  return (
    <div
      className="school fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/70"
      onMouseDown={(e) => e.target === e.currentTarget && closeApply()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-title"
    >
      <div className="bg-white rounded-2xl border-t-[6px] border-lapis-700 shadow-2xl max-w-lg w-full p-6 sm:p-9 relative max-h-[92vh] overflow-y-auto">
        <button onClick={closeApply} aria-label={ui('close')} className="absolute top-4 right-4 w-10 h-10 rounded-full text-ink-muted hover:bg-mist hover:text-ink flex items-center justify-center">
          <i className="fa-solid fa-xmark text-lg" />
        </button>
        <div className="mb-7 pr-10">
          <h2 id="apply-title" className="text-2xl sm:text-[1.75rem] text-ink">{t(site.settings.apply_title) || ui('apply_title')}</h2>
          {t(site.settings.apply_subtitle) && <p className="text-ink-soft mt-2">{t(site.settings.apply_subtitle)}</p>}
        </div>
        <ApplicationForm onDone={closeApply} />
      </div>
    </div>
  );
}
