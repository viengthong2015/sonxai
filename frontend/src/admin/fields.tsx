import { useState } from 'react';
import { COLOR_OPTIONS } from '../lib/colors';
import { pickLocalized, SOURCE_LANG } from '../lib/i18n';
import { useEditLanguages } from './languages';
import type { BlockData, Lang, Localized } from '../lib/types';
import { IconPicker } from './components/IconPicker';
import { ImageField } from './components/MediaPicker';
import { RichTextEditor } from './components/RichTextEditor';
import { Spinner, Toggle } from './components/ui';
import { translateTexts, useMachineTranslation } from './autoTranslate';
import { useAT } from './i18n';
import { errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';

export type FieldType = 'text' | 'textarea' | 'richtext' | 'url' | 'image' | 'icon' | 'bool' | 'select' | 'color' | 'list';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Stored as {"en": "...", "lo": "..."} and edited in the selected language. */
  localized?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  /** Sub-fields for `list`. */
  fields?: FieldDef[];
  itemLabel?: string;
  summaryKey?: string;
  max?: number;
  newItem?: () => BlockData;
  /** Only show this field when the predicate is true for the current object. */
  showIf?: (obj: BlockData) => boolean;
  /** Take half the row on wide screens. */
  half?: boolean;
}

export interface FieldGroup {
  title: string;
  description?: string;
  fields: FieldDef[];
}

function LangTag({ lang }: { lang: Lang }) {
  const languages = useEditLanguages();
  const short = languages.find((l) => l.code === lang)?.short || lang.toUpperCase();
  return (
    <span className={`px-1.5 py-px rounded text-[10px] font-bold tracking-wide normal-case ${lang === SOURCE_LANG ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'}`}>
      {short}
    </span>
  );
}

const plain = (html: string) =>
  html.replace(/<(br|\/p|\/li|\/h\d)>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** The English original shown above a field while translating, with copy and auto-translate. */
function SourceText({ english, canFill, onFill, lang, html }: { english: string; canFill: boolean; onFill: (v: string) => void; lang: Lang; html: boolean }) {
  const at = useAT();
  const toast = useToast();
  const mt = useMachineTranslation();
  const [busy, setBusy] = useState(false);
  const auto = async () => {
    setBusy(true);
    try {
      const [t] = await translateTexts([english], lang, html ? 'html' : 'text');
      onFill(t);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-1.5 flex items-start gap-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
      <span className="mt-px px-1.5 py-px rounded text-[10px] font-bold bg-sky-100 text-sky-700 shrink-0">EN</span>
      <p className="flex-1 text-xs text-slate-600 leading-relaxed line-clamp-3" title={plain(english)}>
        {plain(english)}
      </p>
      {canFill && (
        <span className="shrink-0 flex items-center gap-3">
          {mt.available && (
            <button type="button" onClick={auto} disabled={busy} className="text-[11px] font-bold text-sky-700 hover:underline disabled:opacity-50" title={at('Translate this text with {provider}', { provider: mt.provider })}>
              {busy ? <Spinner className="w-3 h-3 mr-1" /> : <i className="fa-solid fa-wand-magic-sparkles mr-1" />}
              {at('Auto-translate')}
            </button>
          )}
          <button type="button" onClick={() => onFill(english)} className="text-[11px] font-bold text-sky-700 hover:underline" title={at('Copy the English text here, then translate it')}>
            <i className="fa-regular fa-copy mr-1" />
            {at('Copy English')}
          </button>
        </span>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange, lang }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; lang: Lang }) {
  const at = useAT();
  // Localized text fields edit only the active language.
  if (field.localized && (field.type === 'text' || field.type === 'textarea' || field.type === 'richtext')) {
    const loc = (value as Localized) ?? {};
    const current = loc[lang] ?? '';
    const english = loc[SOURCE_LANG] ?? '';
    const translating = lang !== SOURCE_LANG && plain(english) !== '';
    const placeholder = translating ? at('Not translated yet: the website shows the English text') : field.placeholder ? at(field.placeholder) : undefined;
    const set = (v: string) => onChange({ ...loc, [lang]: v });
    let input;
    if (field.type === 'richtext') input = <RichTextEditor key={lang} value={current} onChange={set} placeholder={placeholder} />;
    else if (field.type === 'textarea')
      input = <textarea className="input min-h-[88px]" rows={3} value={current} placeholder={placeholder} onChange={(e) => set(e.target.value)} />;
    else input = <input className="input" value={current} placeholder={placeholder} onChange={(e) => set(e.target.value)} />;
    return (
      <>
        {translating && <SourceText english={english} canFill={!plain(current)} onFill={set} lang={lang} html={field.type === 'richtext'} />}
        {input}
      </>
    );
  }

  const str = typeof value === 'string' ? value : '';
  const ph = field.placeholder ? at(field.placeholder) : undefined;
  switch (field.type) {
    case 'text':
    case 'url':
      return <input className="input" value={str} placeholder={ph} onChange={(e) => onChange(e.target.value)} />;
    case 'textarea':
      return <textarea className="input min-h-[88px]" rows={3} value={str} placeholder={ph} onChange={(e) => onChange(e.target.value)} />;
    case 'richtext':
      return <RichTextEditor value={str} onChange={onChange} />;
    case 'image':
      return <ImageField value={str} onChange={onChange} />;
    case 'icon':
      return <IconPicker value={str} onChange={onChange} />;
    case 'bool':
      return <Toggle checked={!!value} onChange={onChange} label={ph ?? (value ? at('On') : at('Off'))} />;
    case 'select':
      return (
        <select className="input" value={str || field.options?.[0]?.value} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {at(o.label)}
            </option>
          ))}
        </select>
      );
    case 'color':
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={at(c.label)}
              aria-label={at(c.label)}
              aria-pressed={(str || 'brand') === c.value}
              onClick={() => onChange(c.value)}
              className={`w-8 h-8 rounded-full ${c.swatch} ring-offset-2 transition ${(str || 'brand') === c.value ? 'ring-2 ring-slate-800' : 'hover:scale-110'}`}
            />
          ))}
        </div>
      );
    case 'list':
      return <ListInput field={field} value={Array.isArray(value) ? (value as BlockData[]) : []} onChange={onChange} lang={lang} />;
    default:
      return null;
  }
}

function ListInput({ field, value, onChange, lang }: { field: FieldDef; value: BlockData[]; onChange: (v: BlockData[]) => void; lang: Lang }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const at = useAT();
  const max = field.max ?? 50;
  const itemLabel = at(field.itemLabel ?? 'Item');

  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
    if (openIdx === i) setOpenIdx(i + d);
  };
  const add = () => {
    onChange([...value, field.newItem ? field.newItem() : {}]);
    setOpenIdx(value.length);
  };
  const summary = (item: BlockData, i: number) => {
    const raw = field.summaryKey ? item[field.summaryKey] : undefined;
    const text = typeof raw === 'string' ? raw : pickLocalized(raw as Localized, lang);
    return text || `${itemLabel} ${i + 1}`;
  };

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <button type="button" className="flex-1 flex items-center gap-2 text-left px-1 py-1 min-w-0" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
              <i className={`fa-solid fa-chevron-right text-[10px] text-slate-400 transition-transform ${openIdx === i ? 'rotate-90' : ''}`} />
              {typeof item.icon === 'string' && item.icon && <i className={`${item.icon} text-brand-600 text-sm`} />}
              <span className="text-sm font-medium text-slate-700 truncate">{summary(item, i)}</span>
            </button>
            <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={at('Move up')}>
              <i className="fa-solid fa-arrow-up text-xs" />
            </button>
            <button type="button" className="icon-btn" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={at('Move down')}>
              <i className="fa-solid fa-arrow-down text-xs" />
            </button>
            <button type="button" className="icon-btn hover:!text-rose-600" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={at('Remove')}>
              <i className="fa-solid fa-trash text-xs" />
            </button>
          </div>
          {openIdx === i && (
            <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-white rounded-b-xl">
              <FieldsForm fields={field.fields ?? []} value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} lang={lang} />
            </div>
          )}
        </div>
      ))}
      {value.length < max && (
        <button type="button" onClick={add} className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-brand-500 hover:text-brand-700 hover:bg-brand-50/40 transition">
          <i className="fa-solid fa-plus mr-1.5" /> {at('Add {item}', { item: itemLabel })}
        </button>
      )}
    </div>
  );
}

export function FieldsForm({ fields, value, onChange, lang }: { fields: FieldDef[]; value: BlockData; onChange: (v: BlockData) => void; lang: Lang }) {
  const at = useAT();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
      {fields
        .filter((f) => !f.showIf || f.showIf(value))
        .map((f) => (
          <div key={f.key} className={f.half ? '' : 'md:col-span-2'}>
            {f.type !== 'bool' || f.label ? (
              <label className="label">
                {at(f.label)}
                {f.localized && <LangTag lang={lang} />}
              </label>
            ) : null}
            <FieldInput field={f} value={value?.[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} lang={lang} />
            {f.help && <p className="text-xs text-slate-400 mt-1.5">{at(f.help)}</p>}
          </div>
        ))}
    </div>
  );
}
