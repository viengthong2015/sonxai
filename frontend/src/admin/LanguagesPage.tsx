import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { BUILTIN_UI, SOURCE_LANG, UI_KEYS, builtinUi } from '../lib/i18n';
import { useToast } from '../lib/toast';
import type { BlockData, Language, Menu, TranslationItem, TranslationProgress } from '../lib/types';
import { autoTranslateMenu, autoTranslateSettings, translateUiTexts, useMachineTranslation } from './autoTranslate';
import { ADMIN_CATALOG } from './catalog';
import { Badge, ErrorBlock, LoadingBlock, Modal, PageTitle, Spinner, Toggle, useConfirm } from './components/ui';
import { useAT } from './i18n';
import { LANGUAGE_SUGGESTIONS, useDraftSettings, useEditLanguages } from './languages';
import { useInvalidateDraft } from './publish';

const CODE_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;
const MT_CODE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

function useSaveSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const invalidate = useInvalidateDraft();
  const settings = useDraftSettings();
  return useMutation({
    mutationFn: (patch: BlockData) => api.put<BlockData>('/admin/settings', { ...settings.data, ...patch }),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data);
      qc.invalidateQueries({ queryKey: ['admin-ui', 'languages'] });
      invalidate();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
}

/* ---------------------------------------------------------------- add / edit language */
function LanguageModal({ open, onClose, editing, existing }: { open: boolean; onClose: () => void; editing: Language | null; existing: Language[] }) {
  const save = useSaveSettings();
  const toast = useToast();
  const at = useAT();
  const empty: Language = { code: '', name: '', short: '', enabled: false, mt_code: '' };
  const [form, setForm] = useState<Language>(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(editing ? { mt_code: '', ...editing } : empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const taken = new Set(existing.map((l) => l.code));
  const suggestions = LANGUAGE_SUGGESTIONS.filter((s) => !taken.has(s.code));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = form.code.trim().toLowerCase();
    const mt = (form.mt_code ?? '').trim();
    if (!CODE_RE.test(code)) return setError(at('Use a short language code of 2–3 letters, such as hmn, km, th or zh.'));
    if (mt && !MT_CODE_RE.test(mt)) return setError(at('The auto-translate code looks wrong. Use a code like hmn or zh-CN, or leave it empty.'));
    if (!editing && taken.has(code)) return setError(at('That language is already in the list.'));
    const lang: Language = { ...form, code, name: form.name.trim(), short: form.short.trim() || code.toUpperCase(), mt_code: mt };
    const languages = editing ? existing.map((l) => (l.code === editing.code ? lang : l)) : [...existing, lang];
    save.mutate(
      { languages },
      {
        onSuccess: () => {
          toast(editing ? at('Language updated') : at('{language} added. Translate your pages, then turn it on.', { language: lang.name }));
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? at('Edit {language}', { language: editing.name }) : at('Add a language')} size="md">
      <form onSubmit={submit} className="space-y-5">
        {!editing && suggestions.length > 0 && (
          <div>
            <span className="label">{at('Quick pick')}</span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setForm({ ...s, mt_code: '' })}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${form.code === s.code ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <span lang={s.code}>{s.name}</span> <span className="text-slate-400 text-xs ml-1">{s.code}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{at('Or type any other language below, for example Hmong (hmn) or Khmer (km).')}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="lang-code">{at('Code')}</label>
            <input id="lang-code" className="input" required disabled={!!editing} maxLength={12} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} placeholder="hmn" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="lang-name">{at('Name (in that language)')}</label>
            <input id="lang-name" className="input" required maxLength={40} lang={form.code} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hmoob" />
          </div>
          <div>
            <label className="label" htmlFor="lang-short">{at('Switch label')}</label>
            <input id="lang-short" className="input" maxLength={8} lang={form.code} value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value })} placeholder="HMN" />
          </div>
          <p className="sm:col-span-2 self-end text-xs text-slate-500 pb-2">
            {at("The short label appears on the website's language switch, for example EN | ລາວ | HMN.")}
          </p>
          <div>
            <label className="label" htmlFor="lang-mt">{at('Auto-translate code')}</label>
            <input id="lang-mt" className="input" maxLength={12} value={form.mt_code ?? ''} onChange={(e) => setForm({ ...form, mt_code: e.target.value })} placeholder={form.code || 'hmn'} />
          </div>
          <p className="sm:col-span-2 self-end text-xs text-slate-500 pb-2">
            {at('Optional. Only needed when Google Translate uses a different code, e.g. White Hmong (mww) uses hmn. Leave empty to use the code above.')}
          </p>
        </div>
        {!editing && (
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            {at("New languages start hidden, so visitors don't see a half-translated site. Translate your pages, then turn it on and publish.")}
          </p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{at('Cancel')}</button>
          <button className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner className="w-4 h-4" />} {editing ? at('Save') : at('Add language')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- progress */
function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 100;
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct === 100 ? 'bg-leaf-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-10 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

function translateHref(item: TranslationItem, code: string) {
  if (item.kind === 'settings') return `/admin/settings?lang=${code}`;
  if (item.menu_type === 'page') return `/admin/menus/${item.id}?lang=${code}`;
  return '/admin/menus';
}

function ProgressSection({ language, progress }: { language: Language; progress: TranslationProgress }) {
  const at = useAT();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const invalidate = useInvalidateDraft();
  const mt = useMachineTranslation();
  const settings = useDraftSettings();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const done = progress.totals.filled[language.code] ?? 0;
  const missing = progress.items.filter((i) => i.total > (i.filled[language.code] ?? 0));

  const translateAll = async () => {
    const ok = await confirm({
      title: at('Auto-translate everything into {language}?', { language: language.name }),
      message: at('Every empty {language} text on all pages, menus and site settings is filled with {provider} and saved to the draft. Translations you already wrote are not changed. Check the result before you publish.', {
        language: language.name,
        provider: mt.provider,
      }),
      confirmLabel: at('Auto-translate'),
    });
    if (!ok) return;
    let count = 0;
    try {
      const menus = await api.get<Menu[]>('/admin/menus');
      const todo = missing.filter((i) => i.kind === 'menu');
      for (const [n, item] of todo.entries()) {
        const menu = menus.find((m) => m.id === item.id);
        if (!menu) continue;
        setRunning(at('Translating {name} ({n} of {total})…', { name: item.title, n: n + 1, total: todo.length }));
        count += await autoTranslateMenu(menu, language.code);
      }
      if (missing.some((i) => i.kind === 'settings') && settings.data) {
        setRunning(at('Translating site settings…'));
        count += await autoTranslateSettings(settings.data, language.code);
      }
      toast(at('{n} texts translated and saved to the draft. Please check them before you publish.', { n: count }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setRunning(null);
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['menus'] });
      qc.invalidateQueries({ queryKey: ['blocks'] });
      qc.invalidateQueries({ queryKey: ['menu'] });
      invalidate();
    }
  };

  return (
    <div className="border-t border-slate-100 first:border-t-0">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 text-left" aria-expanded={open}>
          <i className={`fa-solid fa-chevron-right text-[10px] text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="font-semibold text-slate-900 min-w-[120px]" lang={language.code}>{language.name}</span>
        </button>
        <span className="text-sm text-slate-500">{at('{done} of {total} texts translated', { done, total: progress.totals.total })}</span>
        <span className="flex-1" />
        {mt.available && missing.length > 0 && (
          <button className="btn-secondary !py-1 !px-3 !text-xs" disabled={!!running} onClick={translateAll}>
            {running ? <Spinner className="w-3.5 h-3.5" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {at('Auto-translate everything missing')}
          </button>
        )}
        <Bar value={done} total={progress.totals.total} />
      </div>
      {running && <p className="px-5 -mt-2 pb-3 text-xs text-brand-700">{running}</p>}
      {open && (
        <ul className="px-5 pb-4 space-y-1">
          {missing.length === 0 && <li className="text-sm text-leaf-700 py-2"><i className="fa-solid fa-circle-check mr-2" />{at('Everything is translated.')}</li>}
          {missing.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
              <i className={`w-4 text-slate-400 ${item.kind === 'settings' ? 'fa-solid fa-sliders' : item.menu_type === 'page' ? 'fa-solid fa-file-lines' : 'fa-solid fa-link'}`} />
              <span className="flex-1 text-sm text-slate-800">{item.kind === 'settings' ? at('Site settings') : item.title}</span>
              <span className="text-xs text-slate-500 tabular-nums">{at('{n} missing', { n: item.total - (item.filled[language.code] ?? 0) })}</span>
              <Link to={translateHref(item, language.code)} className="btn-secondary !py-1 !px-3 !text-xs">
                {at('Translate')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- shared translation table */
interface Row {
  key: string;
  english: string;
  fallback?: string;
}

function TranslationTable({
  code,
  rows,
  saved,
  onSave,
  saving,
  savedMessage,
}: {
  code: string;
  rows: Row[];
  saved: Record<string, string>;
  onSave: (next: Record<string, string>) => void;
  saving: boolean;
  savedMessage: string;
}) {
  const at = useAT();
  const toast = useToast();
  const mt = useMachineTranslation();
  const [draft, setDraft] = useState<Record<string, string>>(saved);
  const [search, setSearch] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [limit, setLimit] = useState(60);
  const [translating, setTranslating] = useState(false);

  useEffect(() => setDraft({ ...saved }), [saved, code]);
  useEffect(() => setLimit(60), [search, onlyMissing, code]);

  const isDone = (r: Row) => !!(draft[r.key] ?? '').trim() || !!r.fallback;
  const filled = rows.filter(isDone).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const q = search.trim().toLowerCase();
  const visible = rows.filter((r) => (!onlyMissing || !isDone(r)) && (!q || r.english.toLowerCase().includes(q) || (draft[r.key] ?? '').toLowerCase().includes(q)));

  const autoTranslate = async () => {
    const todo = rows.filter((r) => !(draft[r.key] ?? '').trim() && !r.fallback);
    if (!todo.length) return toast(at('Nothing to translate: every text already has a translation.'), 'info');
    setTranslating(true);
    try {
      const out = await translateUiTexts(todo.map((r) => r.english), code);
      const next = { ...draft };
      todo.forEach((r, i) => (next[r.key] = out[i]));
      setDraft(next);
      toast(at('{n} texts translated. Check them, then save.', { n: todo.length }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <>
      <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-slate-100">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input className="input !pl-10" placeholder={at('Search texts…')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Toggle checked={onlyMissing} onChange={setOnlyMissing} label={<span className="text-sm text-slate-600">{at('Only untranslated')}</span>} />
        <span className="text-xs text-slate-500 tabular-nums">{at('{done} of {total} translated', { done: filled, total: rows.length })}</span>
        {mt.available && (
          <button className="btn-secondary !py-1.5 !text-xs" disabled={translating} onClick={autoTranslate}>
            {translating ? <Spinner className="w-3.5 h-3.5" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {at('Auto-translate empty')}
          </button>
        )}
        <button className="btn-primary !py-1.5" disabled={!dirty || saving} onClick={() => onSave(draft)}>
          {saving ? <Spinner className="w-4 h-4" /> : <i className="fa-solid fa-floppy-disk" />} {at('Save')}
        </button>
      </div>
      <p className="px-5 pt-3 text-xs text-slate-500">{savedMessage}</p>
      <div className="divide-y divide-slate-100">
        {visible.slice(0, limit).map((r) => (
          <div key={r.key} className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 px-5 py-3 items-center">
            <p className="text-sm text-slate-700 break-words">{r.english}</p>
            <input
              className="input"
              lang={code}
              value={draft[r.key] ?? ''}
              onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })}
              placeholder={r.fallback || at('Not translated: shows English')}
              aria-label={r.english}
            />
          </div>
        ))}
        {visible.length === 0 && <p className="px-5 py-8 text-sm text-slate-500 text-center">{at('No texts match your search.')}</p>}
      </div>
      {visible.length > limit && (
        <div className="px-5 py-4 text-center">
          <button className="btn-secondary" onClick={() => setLimit(limit + 100)}>{at('Show more ({n} left)', { n: visible.length - limit })}</button>
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- website & admin text */
function WebsiteText({ code, uiStrings }: { code: string; uiStrings: Record<string, Record<string, string>> }) {
  const at = useAT();
  const toast = useToast();
  const save = useSaveSettings();
  const rows = useMemo<Row[]>(() => UI_KEYS.map((k) => ({ key: k, english: BUILTIN_UI.en[k], fallback: builtinUi(code, k) })), [code]);
  const saved = useMemo(() => ({ ...(uiStrings[code] ?? {}) }), [uiStrings, code]);
  return (
    <TranslationTable
      code={code}
      rows={rows}
      saved={saved}
      saving={save.isPending}
      savedMessage={at('Fixed wording on the website: form labels, buttons and messages. Changes appear on the website after you publish.')}
      onSave={(next) => save.mutate({ ui_strings: { ...uiStrings, [code]: next } }, { onSuccess: () => toast(at('Website text saved. Publish to show it on the website.')) })}
    />
  );
}

function AdminText({ code }: { code: string }) {
  const at = useAT();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-ui', 'strings', code],
    queryFn: () => api.get<Record<string, string>>(`/admin-ui/strings/${encodeURIComponent(code)}`),
  });
  const save = useMutation({
    mutationFn: (strings: Record<string, string>) => api.put<Record<string, string>>(`/admin/admin-ui/strings/${encodeURIComponent(code)}`, strings),
    onSuccess: (data) => {
      qc.setQueryData(['admin-ui', 'strings', code], data);
      toast(at('Admin panel text saved. It is used right away, no publishing needed.'));
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const rows = useMemo<Row[]>(() => ADMIN_CATALOG.map((s) => ({ key: s, english: s })), []);
  const saved = useMemo(() => q.data ?? {}, [q.data]);
  if (q.isPending) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  return (
    <TranslationTable
      code={code}
      rows={rows}
      saved={saved}
      saving={save.isPending}
      savedMessage={at('Wording of this admin panel. Each staff member chooses their admin language with the language picker at the top. Keep {placeholders} such as {name} unchanged.')}
      onSave={(next) => save.mutate(next)}
    />
  );
}

function TextTranslations({ languages, uiStrings }: { languages: Language[]; uiStrings: Record<string, Record<string, string>> }) {
  const at = useAT();
  const targets = languages.filter((l) => l.code !== SOURCE_LANG);
  const [code, setCode] = useState(targets[0]?.code ?? '');
  const [tab, setTab] = useState<'website' | 'admin'>('website');

  useEffect(() => {
    if (!targets.some((t) => t.code === code)) setCode(targets[0]?.code ?? '');
  }, [targets, code]);

  if (!targets.length || !code) return null;
  return (
    <section className="card">
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-end gap-4 border-b border-slate-100">
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-bold text-slate-900">{at('Labels and messages')}</h2>
          <div className="mt-3 inline-flex gap-1 bg-slate-100 p-1 rounded-full" role="tablist">
            {(
              [
                ['website', at('Website text')],
                ['admin', at('Admin panel text')],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold ${tab === id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
          {at('Language')}
          <select className="input !w-auto" value={code} onChange={(e) => setCode(e.target.value)}>
            {targets.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
      </div>
      {tab === 'website' ? <WebsiteText code={code} uiStrings={uiStrings} /> : <AdminText code={code} />}
    </section>
  );
}

/* ---------------------------------------------------------------- page */
export function LanguagesPage() {
  const settings = useDraftSettings();
  const languages = useEditLanguages();
  const progress = useQuery({ queryKey: ['translations'], queryFn: () => api.get<TranslationProgress>('/admin/translations/progress') });
  const save = useSaveSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const at = useAT();
  const mt = useMachineTranslation();
  const [modal, setModal] = useState<{ open: boolean; editing: Language | null }>({ open: false, editing: null });
  const uiStrings = useMemo(() => (settings.data?.ui_strings as Record<string, Record<string, string>>) ?? {}, [settings.data]);

  if (settings.isPending) return <LoadingBlock />;
  if (settings.isError) return <ErrorBlock message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />;

  const update = (next: Language[], message: string) => save.mutate({ languages: next }, { onSuccess: () => toast(message) });
  const move = (i: number, d: -1 | 1) => {
    const next = [...languages];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    update(next, at('Order updated'));
  };
  const targets = languages.filter((l) => l.code !== SOURCE_LANG);

  return (
    <>
      <PageTitle
        title={at('Languages')}
        subtitle={at('English is the source language. Any text that is not translated shows in English.')}
        actions={<button className="btn-primary" onClick={() => setModal({ open: true, editing: null })}><i className="fa-solid fa-plus" /> {at('Add language')}</button>}
      />

      {!mt.available && (
        <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 flex gap-3">
          <i className="fa-solid fa-wand-magic-sparkles mt-0.5 text-slate-400" />
          <span>{at('Auto-translate is off, so translations are typed by hand. To turn it on, add a Google Cloud Translation API key as GOOGLE_TRANSLATE_API_KEY in backend/.env and restart the server.')}</span>
        </div>
      )}

      <section className="card divide-y divide-slate-100 mb-8">
        {languages.map((l, i) => {
          const source = l.code === SOURCE_LANG;
          return (
            <div key={l.code} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="flex items-center gap-1 w-16">
                {!source && (
                  <>
                    <button className="icon-btn" disabled={i <= 1 || save.isPending} onClick={() => move(i, -1)} aria-label={at('Move up')}><i className="fa-solid fa-arrow-up text-xs" /></button>
                    <button className="icon-btn" disabled={i === languages.length - 1 || save.isPending} onClick={() => move(i, 1)} aria-label={at('Move down')}><i className="fa-solid fa-arrow-down text-xs" /></button>
                  </>
                )}
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900" lang={l.code}>{l.name}</span>
                  <code className="text-xs bg-slate-100 rounded px-1.5 py-0.5 text-slate-600">{l.code}</code>
                  {l.mt_code && <code className="text-xs bg-sky-50 rounded px-1.5 py-0.5 text-sky-700" title={at('Auto-translate code')}>→ {l.mt_code}</code>}
                  {source && <Badge tone="sky">{at('Source')}</Badge>}
                  {!source && !l.enabled && <Badge tone="amber">{at('Hidden')}</Badge>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {at('Switch label')}: <span lang={l.code}>{l.short}</span>
                </div>
              </div>
              {source ? (
                <span className="text-xs text-slate-400">{at('Always shown')}</span>
              ) : (
                <Toggle
                  checked={l.enabled}
                  onChange={(v) =>
                    update(
                      languages.map((x) => (x.code === l.code ? { ...x, enabled: v } : x)),
                      v ? at('{language} will show on the website after you publish', { language: l.name }) : at('{language} hidden after you publish', { language: l.name }),
                    )
                  }
                  label={<span className="text-xs text-slate-600">{at('Shown on website')}</span>}
                />
              )}
              <button className="icon-btn" aria-label={at('Edit {language}', { language: l.name })} onClick={() => setModal({ open: true, editing: l })}><i className="fa-solid fa-pen" /></button>
              <button
                className="icon-btn hover:!text-rose-600"
                aria-label={at('Remove {language}', { language: l.name })}
                disabled={source}
                onClick={async () => {
                  const ok = await confirm({
                    title: at('Remove {language}?', { language: l.name }),
                    message: at('It disappears from the language switch after you publish. Translated page text is kept, so adding the language again brings it back.'),
                    confirmLabel: at('Remove'),
                    danger: true,
                  });
                  if (ok) update(languages.filter((x) => x.code !== l.code), at('{language} removed', { language: l.name }));
                }}
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          );
        })}
      </section>

      {targets.length > 0 && (
        <>
          <h2 className="font-bold text-slate-900 mb-1">{at('Translation progress')}</h2>
          <p className="text-sm text-slate-500 mb-3">{at('Open a language to see which pages still need translating.')}</p>
          <section className="card mb-8">
            {progress.isPending ? (
              <LoadingBlock />
            ) : progress.isError ? (
              <ErrorBlock message={errorMessage(progress.error)} onRetry={() => progress.refetch()} />
            ) : (
              targets.map((l) => <ProgressSection key={l.code} language={l} progress={progress.data} />)
            )}
          </section>
          <TextTranslations languages={languages} uiStrings={uiStrings} />
        </>
      )}

      <LanguageModal open={modal.open} editing={modal.editing} existing={languages} onClose={() => setModal({ open: false, editing: null })} />
    </>
  );
}
