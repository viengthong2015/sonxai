/**
 * Translations: translate the whole website from English into one target language.
 *
 *  - Label translate: interface wording: menu names, buttons, form labels, short header and
 *    footer labels (school name, Dashboard button…) and the admin panel's own wording.
 *  - Content translate: descriptions and messages: the text inside each page, block by block,
 *    and the longer site-wide texts (footer text, address, search-engine description…).
 *
 * Adding or removing languages is a separate screen (LanguagesPage). Translations are saved to
 * the same data the other screens edit, so they apply everywhere.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { pickLocalized, SOURCE_LANG } from '../lib/i18n';
import { useToast } from '../lib/toast';
import type { Block, BlockData, Language, Localized, Menu, TranslationProgress } from '../lib/types';
import { autoTranslateMenu, translateTexts, useMachineTranslation } from './autoTranslate';
import { SCHEMA_BY_TYPE, SETTINGS_GROUPS } from './blockSchemas';
import { RichTextEditor } from './components/RichTextEditor';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, PageTitle, Spinner, Toggle, useConfirm } from './components/ui';
import type { FieldDef } from './fields';
import { msg, useAdminI18n, useAT, type AT } from './i18n';
import { AdminText, Bar, LangColumns, TranslationTable, WebsiteText, useSaveSettings, useTranslateEverything, type Row } from './languageTools';
import { useDraftSettings, useEditLanguages } from './languages';
import { useInvalidateDraft } from './publish';

type Tab = 'labels' | 'content';
type LabelPart = 'menu' | 'site' | 'website' | 'admin';

/* ---------------------------------------------------------------- unsaved-changes registry */
const DirtyCtx = createContext<(id: string, dirty: boolean) => void>(() => {});
/** Returns a stable callback that reports whether the section `id` has unsaved edits. */
function useDirtyReporter(id: string) {
  const report = useContext(DirtyCtx);
  useEffect(() => () => report(id, false), [id, report]);
  return useCallback((d: boolean) => report(id, d), [id, report]);
}

/* ---------------------------------------------------------------- translatable slots */
const plain = (html: string) =>
  html.replace(/<(br|\/p|\/li|\/h\d)>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

type Path = (string | number)[];
interface Slot {
  path: Path;
  label: string;
  english: string;
  kind: 'text' | 'textarea' | 'richtext';
  current: string;
}

/** Every localized text inside `obj` (following list fields) that has English to translate. */
function collectSlots(fields: FieldDef[], obj: BlockData, code: string, at: AT, prefix: Path = [], ctx: string[] = []): Slot[] {
  const out: Slot[] = [];
  for (const f of fields) {
    if (f.showIf && !f.showIf(obj)) continue;
    if (f.type === 'list' && f.fields) {
      const items = Array.isArray(obj[f.key]) ? (obj[f.key] as BlockData[]) : [];
      items.forEach((item, i) => {
        const name = `${at(f.itemLabel ?? 'Item')} ${i + 1}`;
        out.push(...collectSlots(f.fields!, item, code, at, [...prefix, f.key, i], [...ctx, name]));
      });
      continue;
    }
    if (!f.localized || !(f.type === 'text' || f.type === 'textarea' || f.type === 'richtext')) continue;
    const loc = (obj[f.key] as Localized | undefined) ?? {};
    const english = loc[SOURCE_LANG] ?? '';
    if (!plain(english)) continue;
    out.push({ path: [...prefix, f.key], label: [...ctx, at(f.label)].join(' › '), english, kind: f.type, current: loc[code] ?? '' });
  }
  return out;
}

/** Returns a copy of `obj` with the `code` translation at `path` set to `value`. */
function setTranslation<T>(obj: T, path: Path, code: string, value: string): T {
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[head as number] = rest.length ? setTranslation(copy[head as number], rest, code, value) : copy[head as number];
    return copy as T;
  }
  const o = { ...(obj as Record<string, unknown>) };
  if (rest.length) o[head as string] = setTranslation(o[head as string], rest, code, value);
  else o[head as string] = { ...((o[head as string] as Localized) ?? {}), [code]: value };
  return o as T;
}

/** One English → translation row, with Copy English and Auto-translate. */
function SlotRow({ slot, code, onChange }: { slot: Slot; code: string; onChange: (v: string) => void }) {
  const at = useAT();
  const toast = useToast();
  const mt = useMachineTranslation();
  const [busy, setBusy] = useState(false);
  const done = !!plain(slot.current);
  const auto = async () => {
    setBusy(true);
    try {
      const [t] = await translateTexts([slot.english], code, slot.kind === 'richtext' ? 'html' : 'text');
      onChange(t);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const placeholder = at('Not translated yet: the website shows the English text');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-5 px-5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <i className={done ? 'fa-solid fa-circle-check text-leaf-500' : 'fa-regular fa-circle text-amber-400'} />
          <span className="truncate">{slot.label}</span>
        </div>
        <p className="text-sm text-slate-700 break-words mt-0.5 line-clamp-6" title={plain(slot.english)}>{plain(slot.english)}</p>
        {!done && (
          <div className="flex gap-3 mt-1">
            {mt.available && (
              <button type="button" onClick={auto} disabled={busy} className="text-[11px] font-bold text-sky-700 hover:underline disabled:opacity-50">
                {busy ? <Spinner className="w-3 h-3 mr-1" /> : <i className="fa-solid fa-wand-magic-sparkles mr-1" />}
                {at('Auto-translate')}
              </button>
            )}
            <button type="button" onClick={() => onChange(slot.english)} className="text-[11px] font-bold text-sky-700 hover:underline">
              <i className="fa-regular fa-copy mr-1" />
              {at('Copy English')}
            </button>
          </div>
        )}
      </div>
      <div className="min-w-0" lang={code}>
        {slot.kind === 'richtext' ? (
          <RichTextEditor key={code} value={slot.current} onChange={onChange} placeholder={placeholder} />
        ) : slot.kind === 'textarea' ? (
          <textarea className="input min-h-[80px]" rows={3} value={slot.current} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label={slot.label} />
        ) : (
          <input className="input" value={slot.current} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label={slot.label} />
        )}
      </div>
    </div>
  );
}

/**
 * An editable card of slots with its own Save button.
 * `fields` describe `value`; edits stay local until saved.
 */
function SlotCard({
  id,
  title,
  icon,
  badge,
  fields,
  value,
  code,
  onlyMissing,
  onSave,
  saving,
  emptyText,
}: {
  id: string;
  title: ReactNode;
  icon?: string;
  badge?: ReactNode;
  fields: FieldDef[];
  value: BlockData;
  code: string;
  onlyMissing: boolean;
  onSave: (next: BlockData) => void;
  saving: boolean;
  emptyText?: string;
}) {
  const at = useAT();
  const [draft, setDraft] = useState<BlockData>(value);
  const reportDirty = useDirtyReporter(id);
  // Reset only when this card's own data really changed (saving another card refetches everything).
  const valueKey = JSON.stringify(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(value), [valueKey]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);
  useEffect(() => reportDirty(dirty), [dirty, reportDirty]);

  const slots = useMemo(() => collectSlots(fields, draft, code, at), [fields, draft, code, at]);
  // Rows that were untranslated when the card opened stay visible while you type in them.
  const initiallyMissing = useRef<Set<string>>(new Set());
  useEffect(() => {
    initiallyMissing.current = new Set(collectSlots(fields, value, code, at).filter((s) => !plain(s.current)).map((s) => s.path.join('.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, valueKey, code, at]);
  const shown = onlyMissing ? slots.filter((s) => !plain(s.current) || initiallyMissing.current.has(s.path.join('.'))) : slots;
  const done = slots.filter((s) => plain(s.current)).length;

  if (onlyMissing && shown.length === 0 && !dirty) return null;

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60">
        {icon && <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><i className={icon} /></span>}
        <div className="flex-1 min-w-[160px] font-semibold text-slate-900 flex items-center gap-2 flex-wrap">{title} {badge}</div>
        {slots.length > 0 && <span className="text-xs text-slate-500 tabular-nums">{at('{done} of {total} translated', { done, total: slots.length })}</span>}
        <button className="btn-primary !py-1.5" disabled={!dirty || saving} onClick={() => onSave(draft)}>
          {saving ? <Spinner className="w-4 h-4" /> : <i className="fa-solid fa-floppy-disk" />} {at('Save')}
        </button>
      </div>
      {slots.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">{emptyText ?? at('No English text to translate here.')}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          <LangColumns code={code} />
          {shown.map((s) => (
            <SlotRow key={s.path.join('.')} slot={s} code={code} onChange={(v) => setDraft((d) => setTranslation(d, s.path, code, v))} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- shared saving helpers */
function menuBody(menu: Menu, patch: Partial<Menu>) {
  const m = { ...menu, ...patch };
  return {
    slug: m.slug,
    label: m.label,
    menu_type: m.menu_type,
    url: m.url,
    open_in_new_tab: m.open_in_new_tab,
    is_home: m.is_home,
    is_visible: m.is_visible,
    show_in_nav: m.show_in_nav,
    meta_description: m.meta_description ?? {},
  };
}

function useAfterSave() {
  const qc = useQueryClient();
  const invalidate = useInvalidateDraft();
  return () => {
    qc.invalidateQueries({ queryKey: ['translations'] });
    qc.invalidateQueries({ queryKey: ['menus'] });
    qc.invalidateQueries({ queryKey: ['menu'] });
    qc.invalidateQueries({ queryKey: ['blocks'] });
    invalidate();
  };
}

/* ---------------------------------------------------------------- Label translate */
function MenuLabels({ code }: { code: string }) {
  const at = useAT();
  const toast = useToast();
  const afterSave = useAfterSave();
  const reportDirty = useDirtyReporter('labels-menu');
  const menus = useQuery({ queryKey: ['menus'], queryFn: () => api.get<Menu[]>('/admin/menus') });
  const save = useMutation({
    mutationFn: async (next: Record<string, string>) => {
      for (const m of menus.data ?? []) {
        const value = next[String(m.id)] ?? '';
        if (value === (m.label[code] ?? '')) continue;
        await api.put(`/admin/menus/${m.id}`, menuBody(m, { label: { ...m.label, [code]: value } }));
      }
    },
    onSuccess: () => {
      afterSave();
      toast(at('Menu labels saved. Publish to show them on the website.'));
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const rows = useMemo<Row[]>(
    () =>
      (menus.data ?? []).map((m) => ({
        key: String(m.id),
        english: m.label[SOURCE_LANG] ?? '',
        context: [m.menu_type === 'page' ? at('Page with content') : at('Link'), m.is_home ? at('Home') : '', !m.is_visible ? at('Hidden') : !m.show_in_nav ? at('Not in menu') : '']
          .filter(Boolean)
          .join(' · '),
      })),
    [menus.data, at],
  );
  const saved = useMemo(() => Object.fromEntries((menus.data ?? []).map((m) => [String(m.id), m.label[code] ?? ''])), [menus.data, code]);
  if (menus.isPending) return <LoadingBlock />;
  if (menus.isError) return <ErrorBlock message={errorMessage(menus.error)} onRetry={() => menus.refetch()} />;
  return (
    <TranslationTable
      code={code}
      rows={rows}
      saved={saved}
      saving={save.isPending}
      savedMessage={at('The names in the menu bar at the top of every page. Changes appear on the website after you publish.')}
      onSave={(next) => save.mutate(next)}
      onDirty={reportDirty}
    />
  );
}

/** Site-settings texts that are interface labels. Every other translatable setting is content. */
const LABEL_SETTING_KEYS = new Set(['site_name', 'site_tagline', 'dashboard_label', 'footer_name', 'apply_title', 'grades']);

/** The translatable site settings of one kind (labels or content), grouped as in Site settings. */
function SiteTexts({ code, onlyMissing, kind }: { code: string; onlyMissing: boolean; kind: 'label' | 'content' }) {
  const at = useAT();
  const toast = useToast();
  const settings = useDraftSettings();
  const save = useSaveSettings();
  if (settings.isPending) return <LoadingBlock />;
  if (settings.isError || !settings.data) return <ErrorBlock message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />;
  const groups = SETTINGS_GROUPS.map((g) => ({
    ...g,
    fields: g.fields.filter((f) => (f.localized || f.type === 'list') && LABEL_SETTING_KEYS.has(f.key) === (kind === 'label')),
  })).filter((g) => g.fields.length > 0);
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <SlotCard
          key={g.title}
          id={`${kind}-site-${g.title}`}
          title={at(g.title)}
          icon="fa-solid fa-sliders"
          fields={g.fields}
          value={Object.fromEntries(g.fields.map((f) => [f.key, settings.data![f.key]]))}
          code={code}
          onlyMissing={onlyMissing}
          saving={save.isPending}
          emptyText={at('Nothing to translate: the English fields are empty.')}
          onSave={(next) => {
            // Only this group's fields come from the edited copy; the rest stay as saved.
            const patch = Object.fromEntries(g.fields.map((f) => [f.key, next[f.key]]));
            save.mutate(patch, { onSuccess: () => toast(at('Saved. Publish to show the changes on the website.')) });
          }}
        />
      ))}
    </div>
  );
}

function LabelTranslate({ code, part, setPart }: { code: string; part: LabelPart; setPart: (p: LabelPart) => void }) {
  const at = useAT();
  const settings = useDraftSettings();
  const reportWebsite = useDirtyReporter('labels-website');
  const reportAdmin = useDirtyReporter('labels-admin');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const uiStrings = useMemo(() => (settings.data?.ui_strings as Record<string, Record<string, string>>) ?? {}, [settings.data]);
  const parts: { id: LabelPart; icon: string; label: string; text: string }[] = [
    { id: 'menu', icon: 'fa-solid fa-bars-staggered', label: at('Menu bar'), text: at('Names of the pages and links in the top menu.') },
    { id: 'site', icon: 'fa-solid fa-sliders', label: at('Header & footer'), text: at('Short labels: school name, tagline, Dashboard button, footer name, application form title and grade names. Longer texts are under Content translate.') },
    { id: 'website', icon: 'fa-solid fa-globe', label: at('Website text'), text: at('Fixed interface wording on the website: buttons, form labels and short messages.') },
    { id: 'admin', icon: 'fa-solid fa-user-shield', label: at('Admin panel text'), text: at('The wording of this admin panel, including the User manual. Used right away, no publishing needed.') },
  ];
  const current = parts.find((p) => p.id === part)!;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4" role="tablist" aria-label={at('Label translate')}>
        {parts.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={part === p.id}
            onClick={() => setPart(p.id)}
            className={`text-left rounded-xl border px-3 py-2.5 transition ${part === p.id ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            <div className="font-semibold text-sm"><i className={`${p.icon} mr-1.5`} /> {p.label}</div>
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-500 mb-3">{current.text}</p>
      {part === 'site' && (
        <div className="mb-3"><Toggle checked={onlyMissing} onChange={setOnlyMissing} label={<span className="text-sm text-slate-600">{at('Only untranslated')}</span>} /></div>
      )}
      {part === 'menu' && <section className="card"><MenuLabels code={code} /></section>}
      {part === 'site' && <SiteTexts code={code} onlyMissing={onlyMissing} kind="label" />}
      {part === 'website' && <section className="card"><WebsiteText code={code} uiStrings={uiStrings} onDirty={reportWebsite} /></section>}
      {part === 'admin' && <section className="card"><AdminText code={code} onDirty={reportAdmin} /></section>}
    </>
  );
}

/* ---------------------------------------------------------------- Content translate */
const META_FIELDS: FieldDef[] = [{ key: 'meta_description', label: msg('Search engine description'), type: 'textarea', localized: true }];

function PageContent({ menu, code }: { menu: Menu; code: string }) {
  const at = useAT();
  const toast = useToast();
  const confirm = useConfirm();
  const afterSave = useAfterSave();
  const mt = useMachineTranslation();
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const blocks = useQuery({ queryKey: ['blocks', menu.id], queryFn: () => api.get<Block[]>(`/admin/menus/${menu.id}/blocks`) });
  const [savingId, setSavingId] = useState<string | null>(null);

  const saveBlock = async (b: Block, data: BlockData) => {
    setSavingId(`b${b.id}`);
    try {
      await api.put(`/admin/blocks/${b.id}`, { data });
      afterSave();
      toast(at('Saved. Publish to show the changes on the website.'));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSavingId(null);
    }
  };
  const saveMeta = async (data: BlockData) => {
    setSavingId('meta');
    try {
      await api.put(`/admin/menus/${menu.id}`, menuBody(menu, { meta_description: (data.meta_description as Localized) ?? {} }));
      afterSave();
      toast(at('Saved. Publish to show the changes on the website.'));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSavingId(null);
    }
  };
  const autoPage = async () => {
    const ok = await confirm({
      title: at('Auto-translate this page?'),
      message: at('Every empty text on this page is filled with {provider} and saved to the draft. Translations you already wrote are not changed.', { provider: mt.provider }),
      confirmLabel: at('Auto-translate'),
    });
    if (!ok) return;
    setAutoRunning(true);
    try {
      const n = await autoTranslateMenu(menu, code);
      toast(at('{n} texts translated and saved to the draft. Please check them before you publish.', { n }));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      afterSave();
      setAutoRunning(false);
    }
  };

  const metaValue = useMemo(() => ({ meta_description: menu.meta_description ?? {} }), [menu.meta_description]);
  const previewHref = `${menu.is_home ? '/admin/preview' : `/admin/preview/${menu.slug}`}?guide=1`;

  return (
    <div className="space-y-4 min-w-0">
      <div className="card px-5 py-3.5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            {pickLocalized(menu.label, SOURCE_LANG)}
            {menu.is_home && <Badge tone="green">{at('Home')}</Badge>}
            {!menu.is_visible && <Badge tone="rose">{at('Hidden')}</Badge>}
          </div>
          <div className="text-xs text-slate-500">/{menu.is_home ? '' : menu.slug}</div>
        </div>
        <Toggle checked={onlyMissing} onChange={setOnlyMissing} label={<span className="text-sm text-slate-600">{at('Only untranslated')}</span>} />
        {mt.available && (
          <button className="btn-secondary !py-1.5 !text-xs" disabled={autoRunning} onClick={autoPage}>
            {autoRunning ? <Spinner className="w-3.5 h-3.5" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {at('Auto-translate page')}
          </button>
        )}
        <a href={previewHref} target="_blank" rel="noopener" className="btn-secondary !py-1.5 !text-xs"><i className="fa-solid fa-eye" /> {at('Preview')}</a>
        <Link to={`/admin/menus/${menu.id}`} className="btn-secondary !py-1.5 !text-xs"><i className="fa-solid fa-pen-to-square" /> {at('Edit content')}</Link>
      </div>

      {blocks.isPending ? (
        <LoadingBlock />
      ) : blocks.isError ? (
        <ErrorBlock message={errorMessage(blocks.error)} onRetry={() => blocks.refetch()} />
      ) : (
        <>
          {blocks.data.length === 0 && <EmptyState icon="fa-solid fa-layer-group" title={at('This page is empty')} text={at('Add blocks in the page editor first, then translate them here.')} />}
          {blocks.data.map((b, i) => {
            const schema = SCHEMA_BY_TYPE[b.block_type];
            if (!schema) return null;
            return (
              <SlotCard
                key={b.id}
                id={`content-${b.id}`}
                title={<><span className="text-slate-400 tabular-nums">{i + 1}.</span> {at(schema.name)}</>}
                icon={schema.icon}
                badge={!b.is_visible ? <Badge tone="rose">{at('Hidden')}</Badge> : undefined}
                fields={schema.fields}
                value={b.data}
                code={code}
                onlyMissing={onlyMissing}
                saving={savingId === `b${b.id}`}
                onSave={(data) => saveBlock(b, data)}
              />
            );
          })}
          <SlotCard
            id={`content-meta-${menu.id}`}
            title={at('Search engine description')}
            icon="fa-brands fa-google"
            fields={META_FIELDS}
            value={metaValue}
            code={code}
            onlyMissing={onlyMissing}
            saving={savingId === 'meta'}
            emptyText={at('No English description for this page. Add one in Menu settings if you want Google to show it.')}
            onSave={saveMeta}
          />
        </>
      )}
    </div>
  );
}

/** Longer site-wide texts (footer text, address, descriptions, pop-up text). */
function SiteContent({ code }: { code: string }) {
  const at = useAT();
  const [onlyMissing, setOnlyMissing] = useState(false);
  return (
    <div className="space-y-4 min-w-0">
      <div className="card px-5 py-3.5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <div className="font-bold text-slate-900">{at('Header & footer')}</div>
          <div className="text-xs text-slate-500">{at('Texts shown on every page: footer text, address, search-engine description and the application pop-up.')}</div>
        </div>
        <Toggle checked={onlyMissing} onChange={setOnlyMissing} label={<span className="text-sm text-slate-600">{at('Only untranslated')}</span>} />
      </div>
      <SiteTexts code={code} onlyMissing={onlyMissing} kind="content" />
    </div>
  );
}

const SITE_KEY = 'site';

function ContentTranslate({ code, pageKey, setPage, progress }: { code: string; pageKey: string | null; setPage: (key: string) => void; progress?: TranslationProgress }) {
  const at = useAT();
  const menus = useQuery({ queryKey: ['menus'], queryFn: () => api.get<Menu[]>('/admin/menus') });
  if (menus.isPending) return <LoadingBlock />;
  if (menus.isError) return <ErrorBlock message={errorMessage(menus.error)} onRetry={() => menus.refetch()} />;
  const pages = menus.data.filter((m) => m.menu_type === 'page');
  const missingOf = (id: number) => {
    const item = progress?.items.find((x) => x.kind === 'menu' && x.id === id);
    return item ? item.total - (item.filled[code] ?? 0) : null;
  };
  const siteSelected = pageKey === SITE_KEY || pages.length === 0;
  const page = siteSelected ? null : pages.find((p) => String(p.id) === pageKey) ?? pages.find((p) => p.is_home) ?? pages[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-4 items-start">
      <nav className="card p-2 lg:sticky lg:top-40 space-y-0.5" aria-label={at('Pages')}>
        <div className="px-2.5 pt-1.5 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{at('Every page')}</div>
        <button
          type="button"
          onClick={() => setPage(SITE_KEY)}
          aria-current={siteSelected ? 'page' : undefined}
          className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${siteSelected ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <i className="fa-solid fa-sliders w-4 text-center text-slate-400" />
          <span className="flex-1 truncate">{at('Header & footer')}</span>
        </button>
        <div className="px-2.5 pt-3 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{at('Pages')}</div>
        {pages.length === 0 && <p className="px-2.5 pb-2 text-xs text-slate-500">{at('Create a page in Menus & Pages first.')}</p>}
        {pages.map((p) => {
          const missing = missingOf(p.id);
          const active = !!page && p.id === page.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(String(p.id))}
              aria-current={active ? 'page' : undefined}
              className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm ${active ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <i className={`fa-solid ${p.is_home ? 'fa-house' : 'fa-file-lines'} w-4 text-center text-slate-400`} />
              <span className={`flex-1 truncate ${!p.is_visible ? 'line-through text-slate-400' : ''}`}>{pickLocalized(p.label, SOURCE_LANG)}</span>
              {missing === 0 ? (
                <i className="fa-solid fa-circle-check text-leaf-500 text-xs" title={at('Everything is translated.')} />
              ) : missing !== null ? (
                <span className="text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 px-1.5 tabular-nums" title={at('{n} missing', { n: missing })}>{missing}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      {page ? <PageContent key={`${page.id}-${code}`} menu={page} code={code} /> : <SiteContent key={code} code={code} />}
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export function TranslationsPage() {
  const at = useAT();
  const confirm = useConfirm();
  const settings = useDraftSettings();
  const languages = useEditLanguages();
  const mt = useMachineTranslation();
  const progress = useQuery({ queryKey: ['translations'], queryFn: () => api.get<TranslationProgress>('/admin/translations/progress') });
  const [params, setParams] = useSearchParams();
  const targets = languages.filter((l) => l.code !== SOURCE_LANG);
  // Target language: the one in the link, else the admin panel's language (what staff usually mean), else the first.
  const { lang: adminLang } = useAdminI18n();
  const wanted = params.get('lang') ?? adminLang;
  const code = targets.some((t) => t.code === wanted) ? wanted : targets[0]?.code ?? '';
  const language: Language | undefined = targets.find((t) => t.code === code);
  const tab: Tab = params.get('tab') === 'content' ? 'content' : 'labels';
  const partParam = params.get('part');
  const part: LabelPart = partParam === 'site' || partParam === 'website' || partParam === 'admin' ? partParam : 'menu';
  const pageKey = params.get('page');
  const everything = useTranslateEverything(language, progress.data);

  // Unsaved edits anywhere on the screen: warn before switching language, tab or page, or leaving.
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const report = useCallback((id: string, d: boolean) => setDirty((prev) => (!!prev[id] === d ? prev : { ...prev, [id]: d })), []);
  const anyDirty = Object.values(dirty).some(Boolean);
  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyDirty]);

  const go = async (patch: Record<string, string | null>) => {
    if (anyDirty) {
      const ok = await confirm({
        title: at('Discard unsaved translations?'),
        message: at('Some translations on this screen are not saved yet. Save them first, or discard them to continue.'),
        confirmLabel: at('Discard'),
        danger: true,
      });
      if (!ok) return;
      setDirty({});
    }
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  if (settings.isPending) return <LoadingBlock />;
  if (settings.isError) return <ErrorBlock message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />;

  const pct = (c: string) => {
    const t = progress.data?.totals;
    if (!t) return null;
    return t.total ? Math.round(((t.filled[c] ?? 0) / t.total) * 100) : 100;
  };

  return (
    <DirtyCtx.Provider value={report}>
      <PageTitle
        title={at('Translations')}
        subtitle={at('Translate from English into the language you choose. Translations apply everywhere on the website; anything not translated shows in English.')}
      />

      {!mt.available && (
        <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 flex gap-3">
          <i className="fa-solid fa-wand-magic-sparkles mt-0.5 text-slate-400" />
          <span>{at('Auto-translate is off, so translations are typed by hand. To turn it on, add a Google Cloud Translation API key as GOOGLE_TRANSLATE_API_KEY in backend/.env and restart the server.')}</span>
        </div>
      )}

      {!targets.length || !language ? (
        <EmptyState
          icon="fa-solid fa-language"
          title={at('Add a language to start translating')}
          text={at('Languages are added under Languages, for example Lao (lo) or Hmong (hmn).')}
          action={<Link to="/admin/languages" className="btn-primary"><i className="fa-solid fa-earth-asia" /> {at('Languages')}</Link>}
        />
      ) : (
        <>
          {/* Always visible while scrolling: which tab, and which language you are translating into. */}
          <div className="sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 mb-4 bg-slate-50/95 backdrop-blur border-b border-slate-200/70">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-slate-200/60 p-1 rounded-2xl" role="tablist" aria-label={at('Translations')}>
                {(
                  [
                    ['labels', 'fa-solid fa-tags', at('Label translate'), at('Menu bar, header, footer, buttons')],
                    ['content', 'fa-solid fa-file-lines', at('Content translate'), at('Text inside each page')],
                  ] as const
                ).map(([id, icon, label, hint]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => tab !== id && go({ tab: id })}
                    title={hint}
                    className={`rounded-xl px-4 py-1.5 text-left transition ${tab === id ? 'bg-white shadow-sm text-brand-800' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <div className="font-bold text-sm whitespace-nowrap"><i className={`${icon} mr-1.5`} /> {label}</div>
                    <div className="text-[11px] opacity-80 hidden sm:block">{hint}</div>
                  </button>
                ))}
              </div>
              <span className="flex-1" />
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="whitespace-nowrap">{at('From')}</span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-800">
                  <span className="px-1.5 py-px rounded text-[10px] font-bold bg-sky-100 text-sky-700">EN</span> {at('English')}
                </span>
                <i className="fa-solid fa-arrow-right text-xs text-slate-400" />
                <label htmlFor="translate-into" className="whitespace-nowrap">{at('Translate into')}</label>
                <select
                  id="translate-into"
                  className="input !w-auto !py-1.5 font-semibold text-brand-800 border-brand-300 bg-brand-50"
                  value={code}
                  onChange={(e) => go({ lang: e.target.value })}
                >
                  {targets.map((l) => {
                    const p = pct(l.code);
                    return (
                      <option key={l.code} value={l.code}>
                        {`${l.name} (${l.code})${p !== null ? ` – ${p}%` : ''}${l.enabled ? '' : ` · ${at('Hidden')}`}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Progress of the selected language */}
          <div className="card p-4 mb-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900" lang={language.code}>{language.name}</span>
              {progress.data && (
                <>
                  <span>{at('{done} of {total} texts translated', { done: progress.data.totals.filled[code] ?? 0, total: progress.data.totals.total })}</span>
                  <div className="flex-1 min-w-[160px] max-w-md"><Bar value={progress.data.totals.filled[code] ?? 0} total={progress.data.totals.total} /></div>
                </>
              )}
              <span className="flex-1" />
              {everything.available && (
                <button className="btn-secondary !py-1.5 !text-xs" disabled={!!everything.running} onClick={everything.run}>
                  {everything.running ? <Spinner className="w-3.5 h-3.5" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {at('Auto-translate everything missing')}
                </button>
              )}
            </div>
            {everything.running && <p className="mt-2 text-xs text-brand-700">{everything.running}</p>}
            {!language.enabled && (
              <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <i className="fa-solid fa-eye-slash mr-1.5" />
                {at('{language} is hidden on the website. When the translation is ready, turn on Shown on website under Languages and publish.', { language: language.name })}
              </p>
            )}
          </div>

          {tab === 'labels' ? (
            <LabelTranslate key={code} code={code} part={part} setPart={(p) => go({ part: p })} />
          ) : (
            <ContentTranslate code={code} pageKey={pageKey} setPage={(key) => go({ page: key })} progress={progress.data} />
          )}
        </>
      )}
    </DirtyCtx.Provider>
  );
}
