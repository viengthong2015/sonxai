/**
 * Building blocks of the Translations screen: managing languages, the text tables for
 * website and admin wording, and "auto-translate everything".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { fontFaceCss } from '../lib/fonts';
import { api, errorMessage } from '../lib/api';
import { BUILTIN_UI, SOURCE_LANG, UI_KEYS, builtinUi } from '../lib/i18n';
import { useToast } from '../lib/toast';
import type { BlockData, Language, Menu, TranslationProgress } from '../lib/types';
import { autoTranslateMenu, autoTranslateSettings, translateUiTexts, useMachineTranslation } from './autoTranslate';
import { ADMIN_CATALOG } from './catalog';
import { Badge, ErrorBlock, LoadingBlock, Modal, Spinner, Toggle, useConfirm } from './components/ui';
import { useAT } from './i18n';
import { LANGUAGE_SUGGESTIONS, useDraftSettings, useEditLanguages } from './languages';
import { useInvalidateDraft } from './publish';

const CODE_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;
const MT_CODE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export function useSaveSettings() {
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
export function LanguageModal({ open, onClose, editing, existing }: { open: boolean; onClose: () => void; editing: Language | null; existing: Language[] }) {
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

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFont = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<{ id: number; name: string; format: string; size: number }>('/admin/fonts', fd);
    },
    onSuccess: (f) => setForm((cur) => ({ ...cur, font_id: f.id, font_name: f.name, font_format: f.format })),
    onError: (e) => setError(errorMessage(e)),
  });

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
                  onClick={() => setForm({ ...form, ...s, mt_code: '' })}
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
        {/* Font used for everything written in this language */}
        <div>
          <span className="label">{at('Font')}</span>
          <div className="rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              {form.font_id ? (
                <>
                  <style>{fontFaceCss('sx-font-preview', form.font_id, form.font_format || 'woff2')}</style>
                  <div className="text-xs text-slate-500 truncate"><i className="fa-solid fa-font mr-1.5" />{form.font_name}</div>
                  <div className="text-xl text-slate-900 truncate mt-0.5" style={{ fontFamily: '"sx-font-preview", sans-serif' }} data-font-preview="">
                    {form.name || 'Aa'} · {form.short || 'Aa Bb 123'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">{at('Default font. Upload a font if this language needs its own.')}</div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <input
                ref={fileRef}
                type="file"
                accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFont.mutate(f);
                  e.target.value = '';
                }}
              />
              <button type="button" className="btn-secondary !py-1.5 !text-xs" disabled={uploadFont.isPending} onClick={() => fileRef.current?.click()}>
                {uploadFont.isPending ? <Spinner className="w-3.5 h-3.5" /> : <i className="fa-solid fa-upload" />} {form.font_id ? at('Change font') : at('Upload font')}
              </button>
              {form.font_id ? (
                <button type="button" className="btn-secondary !py-1.5 !text-xs hover:!text-rose-600" onClick={() => setForm({ ...form, font_id: null, font_name: '', font_format: '' })}>
                  <i className="fa-solid fa-xmark" /> {at('Remove font')}
                </button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {at('WOFF2, WOFF, TTF or OTF, up to 10 MB. The font is used everywhere this language is shown: website, menus, labels, content and the admin panel. Click Save to apply it.')}
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
          <button className="btn-primary" disabled={save.isPending || uploadFont.isPending}>
            {save.isPending && <Spinner className="w-4 h-4" />} {editing ? at('Save') : at('Add language')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- progress */
export function Bar({ value, total }: { value: number; total: number }) {
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

/* ---------------------------------------------------------------- shared translation table */
export interface Row {
  key: string;
  english: string;
  fallback?: string;
  /** Where the text is used, shown above the English (e.g. "Page" or "Link"). */
  context?: string;
}

export function TranslationTable({
  code,
  rows,
  saved,
  onSave,
  saving,
  savedMessage,
  onDirty,
}: {
  code: string;
  rows: Row[];
  saved: Record<string, string>;
  onSave: (next: Record<string, string>) => void;
  saving: boolean;
  savedMessage: string;
  /** Told whether there are unsaved edits, so the page can warn before they are lost. */
  onDirty?: (dirty: boolean) => void;
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
  useEffect(() => onDirty?.(dirty), [dirty, onDirty]);
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
        <LangColumns code={code} />
        {visible.slice(0, limit).map((r) => (
          <div key={r.key} className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6 px-5 py-3 items-center">
            <div className="min-w-0">
              {r.context && <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{r.context}</div>}
              <p className="text-sm text-slate-700 break-words">{r.english}</p>
            </div>
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
export function WebsiteText({ code, uiStrings, onDirty }: { code: string; uiStrings: Record<string, Record<string, string>>; onDirty?: (d: boolean) => void }) {
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
      onDirty={onDirty}
      onSave={(next) => save.mutate({ ui_strings: { ...uiStrings, [code]: next } }, { onSuccess: () => toast(at('Website text saved. Publish to show it on the website.')) })}
    />
  );
}

export function AdminText({ code, onDirty }: { code: string; onDirty?: (d: boolean) => void }) {
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
      onDirty={onDirty}
    />
  );
}


/* ---------------------------------------------------------------- auto-translate everything */
/** Fills every empty text of one language (pages, menus, settings) and saves it to the draft. */
export function useTranslateEverything(language: Language | undefined, progress: TranslationProgress | undefined) {
  const at = useAT();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const invalidate = useInvalidateDraft();
  const mt = useMachineTranslation();
  const settings = useDraftSettings();
  const [running, setRunning] = useState<string | null>(null);

  const run = async () => {
    if (!language || !progress) return;
    const missing = progress.items.filter((i) => i.total > (i.filled[language.code] ?? 0));
    if (!missing.length) return toast(at('Everything is translated.'), 'info');
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
      qc.invalidateQueries({ queryKey: ['translations'] });
      invalidate();
    }
  };
  return { run, running, available: mt.available };
}

/* ---------------------------------------------------------------- manage languages */
/** Add, edit, remove, order and show/hide languages. */
export function ManageLanguages({ onClose }: { onClose?: () => void }) {
  const languages = useEditLanguages();
  const save = useSaveSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const at = useAT();
  const [modal, setModal] = useState<{ open: boolean; editing: Language | null }>({ open: false, editing: null });

  const update = (next: Language[], message: string) => save.mutate({ languages: next }, { onSuccess: () => toast(message) });
  const move = (i: number, d: -1 | 1) => {
    const next = [...languages];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    update(next, at('Order updated'));
  };

  return (
    <section className="card mb-6">
      <div className="px-5 py-3.5 flex flex-wrap items-center gap-3 border-b border-slate-100">
        <div className="flex-1 min-w-[200px]">
          <h2 className="font-bold text-slate-900">{at('Available languages')}</h2>
          <p className="text-xs text-slate-500">{at('New languages start hidden. Turn on Shown on website when the translation is ready.')}</p>
        </div>
        <button className="btn-primary !py-1.5" onClick={() => setModal({ open: true, editing: null })}><i className="fa-solid fa-plus" /> {at('Add language')}</button>
        {onClose && <button className="icon-btn" onClick={onClose} aria-label={at('Close')}><i className="fa-solid fa-xmark" /></button>}
      </div>
      <div className="divide-y divide-slate-100">
        {languages.map((l, i) => {
          const source = l.code === SOURCE_LANG;
          return (
            <div key={l.code} className="flex flex-wrap items-center gap-3 px-5 py-3">
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
                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-4">
                  <span>{at('Switch label')}: <span lang={l.code}>{l.short}</span></span>
                  <span>
                    <i className="fa-solid fa-font mr-1" />
                    {at('Font')}: {l.font_id ? <span className="text-slate-700">{l.font_name}</span> : at('Default')}
                  </span>
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
      </div>
      <LanguageModal open={modal.open} editing={modal.editing} existing={languages} onClose={() => setModal({ open: false, editing: null })} />
    </section>
  );
}

/** Column headings of a translation table: "English → <language>". */
export function LangColumns({ code }: { code: string }) {
  const at = useAT();
  const language = useEditLanguages().find((l) => l.code === code);
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-6 px-5 py-2 bg-slate-50 text-xs font-bold text-slate-500">
      <span><span className="px-1.5 py-px rounded text-[10px] bg-sky-100 text-sky-700 mr-1.5">EN</span>{at('English')}</span>
      <span>
        <span className="px-1.5 py-px rounded text-[10px] bg-amber-100 text-amber-800 mr-1.5" lang={code}>{language?.short || code.toUpperCase()}</span>
        <span lang={code}>{language?.name ?? code}</span> <span className="font-normal text-slate-400">({code})</span>
      </span>
    </div>
  );
}
