import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../../lib/types';
import { useAdminI18n, useAT } from '../i18n';
import { useEditLanguages } from '../languages';

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  const at = useAT();
  return <span className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} role="status" aria-label={at('Loading')} />;
}

export function LoadingBlock() {
  return (
    <div className="py-20 flex justify-center text-brand-600">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const at = useAT();
  return (
    <div className="card p-6 text-center space-y-3">
      <p className="text-rose-600 text-sm whitespace-pre-line">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          {at('Try again')}
        </button>
      )}
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-2xl mx-auto mb-4">
        <i className={icon} />
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      {text && <p className="text-sm text-slate-500 mt-1">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`inline-flex items-center gap-2.5 select-none ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'rose' | 'sky' | 'violet' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const at = useAT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input, textarea, select')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  // Portal to <body>: a parent with backdrop-filter/transform (e.g. the glass top bar) would
  // otherwise become the containing block of this `fixed` overlay and clip it.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div ref={ref} className={`bg-white rounded-3xl shadow-2xl border border-slate-100 w-full ${widths[size]} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label={at('Close')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------------------------------------------------------- confirm dialog */
interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}
const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const at = useAT();
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => close(false)}>
              {at('Cancel')}
            </button>
            <button className={state?.danger ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)} autoFocus>
              {state?.confirmLabel ?? at('Confirm')}
            </button>
          </>
        }
      >
        <div className="text-sm text-slate-600">{state?.message}</div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);

/* ---------------------------------------------------------------- editing language switch */
/** Which language the editor is writing in. Lists every language, including hidden ones. */
export function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const languages = useEditLanguages();
  const at = useAT();
  if (languages.length > 4) {
    return (
      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
        {at('Editing')}
        <select className="input !w-auto !py-1.5 !text-sm font-semibold" value={lang} onChange={(e) => onChange(e.target.value)}>
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
              {l.code === 'en' ? ` (${at('source')})` : l.enabled ? '' : ` (${at('hidden')})`}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200" role="tablist" aria-label={at('Editing language')}>
      {languages.map((l) => (
        <button
          key={l.code}
          role="tab"
          aria-selected={lang === l.code}
          onClick={() => onChange(l.code)}
          title={l.enabled ? l.name : `${l.name} (${at('not shown on the website yet')})`}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${lang === l.code ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {l.name}
          {!l.enabled && <i className="fa-regular fa-eye-slash ml-1.5 opacity-60" />}
        </button>
      ))}
    </div>
  );
}

function formatDateIn(locale: string, iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return withTime
    ? d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString(locale, { dateStyle: 'medium' });
}

/** Date helpers in the staff member's admin language. */
export function useDates() {
  const { at, locale } = useAdminI18n();
  const formatDate = (iso: string | null | undefined, withTime = true) => formatDateIn(locale, iso, withTime);
  const timeAgo = (iso: string | null | undefined): string => {
    if (!iso) return at('never');
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return at('just now');
    const m = Math.round(s / 60);
    if (m < 60) return at('{n} min ago', { n: m });
    const h = Math.round(m / 60);
    if (h < 24) return at('{n} h ago', { n: h });
    const d = Math.round(h / 24);
    return d < 30 ? at('{n} days ago', { n: d }) : formatDate(iso, false);
  };
  return { formatDate, timeAgo };
}
