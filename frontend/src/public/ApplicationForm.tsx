import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../lib/api';
import { useLang } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { useSite } from './SiteContext';

const inputCls =
  'w-full px-4 py-3 leading-6 rounded-lg border-2 border-rule bg-white text-ink text-base placeholder:text-ink-muted/70 focus:border-lapis-700 focus:outline-none transition-colors';
const labelCls = 'block font-bold text-ink mb-1.5';

const EMPTY = { parent_name: '', phone: '', child_name: '', grade: '', message: '', website: '' };

export function ApplicationForm({ onDone }: { onDone?: () => void }) {
  const { site, mode } = useSite();
  const { t, ui } = useLang();
  const toast = useToast();
  const grades = site.settings.grades ?? [];
  const [form, setForm] = useState({ ...EMPTY, grade: t(grades[0]?.label) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'preview') {
      toast(ui('preview_disabled'), 'info');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/public/applications', form);
      toast(ui('thanks'));
      setForm({ ...EMPTY, grade: t(grades[0]?.label) });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className={labelCls} htmlFor="ap-parent">{ui('parent_name')}</label>
        <input id="ap-parent" type="text" required minLength={2} maxLength={120} placeholder={ui('parent_placeholder')} value={form.parent_name} onChange={set('parent_name')} className={inputCls} autoComplete="name" />
      </div>
      <div>
        <label className={labelCls} htmlFor="ap-phone">{ui('phone')}</label>
        <input id="ap-phone" type="tel" required minLength={5} maxLength={40} pattern={'[0-9+\\(\\)\\-\\s.]+'} placeholder="+856 20 5555 1234" value={form.phone} onChange={set('phone')} className={inputCls} autoComplete="tel" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="ap-child">{ui('child_name')}</label>
          <input id="ap-child" type="text" maxLength={120} value={form.child_name} onChange={set('child_name')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="ap-grade">{ui('grade')}</label>
          <select id="ap-grade" value={form.grade} onChange={set('grade')} className={inputCls}>
            {grades.map((g, i) => (
              <option key={i} value={t(g.label)}>{t(g.label)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="ap-msg">{ui('message')}</label>
        <textarea id="ap-msg" rows={3} maxLength={2000} value={form.message} onChange={set('message')} className={inputCls} />
      </div>
      {/* Honeypot: hidden from people, bots tend to fill it in. */}
      <div className="hidden" aria-hidden="true">
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} name="website" />
      </div>
      {error && <p role="alert" className="text-hibiscus-700 bg-hibiscus-50 border-l-4 border-hibiscus-600 px-4 py-3 whitespace-pre-line">{error}</p>}
      <button type="submit" disabled={busy} className="btn-apply w-full text-lg disabled:opacity-60">
        {busy ? ui('submitting') : ui('submit')}
      </button>
    </form>
  );
}
