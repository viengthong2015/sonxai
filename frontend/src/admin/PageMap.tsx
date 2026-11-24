/**
 * "Page map" in the User manual: the real draft website with section labels (preview guide
 * mode in an iframe), a numbered list of the page's blocks, and an explanation of the main
 * home-page sections. Each item links to the admin screen that edits it.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { pickLocalized } from '../lib/i18n';
import type { Block, BlockType, Localized, Menu } from '../lib/types';
import { SCHEMA_BY_TYPE } from './blockSchemas';
import { Badge } from './components/ui';
import { msg, useAT } from './i18n';

const VIEW_H = 600; // visible height of the preview, in screen pixels
const DESKTOP_W = 1280; // the preview is drawn at desktop width and scaled down to fit
const PHONE_W = 390;

/** The four main sections of the home page, explained in plain words. */
const KEY_SECTIONS: { type: BlockType; where: string; sees: string }[] = [
  {
    type: 'hero',
    where: msg('The large blue banner at the very top of the home page, right under the menu bar.'),
    sees: msg('The school’s main message: a small label, a big headline, a short subtitle, one or two buttons (for example Apply now), small trust badges and up to four alphabet flashcards.'),
  },
  {
    type: 'stats',
    where: msg('A row of key numbers, usually directly under the hero banner.'),
    sees: msg('Up to four numbers, such as students, teachers or years of teaching, each with an icon and a label.'),
  },
  {
    type: 'cards',
    where: msg('A section in the middle of the page with a title and a grid of cards.'),
    sees: msg('Programs, services or reasons to choose the school. Each card has an icon, a title, a short text and an optional link.'),
  },
  {
    type: 'cta',
    where: msg('A full-width banner, usually near the bottom of the page above the footer.'),
    sees: msg('A short invitation (for example Ready to join us?) with one button that opens the application form or a link.'),
  },
];

function summaryOf(b: Block): string {
  const schema = SCHEMA_BY_TYPE[b.block_type];
  if (!schema) return '';
  return pickLocalized(b.data[schema.summaryKey] as Localized, 'en').replace(/<[^>]+>/g, '').trim();
}

/** Measures the preview box, so a desktop-width iframe can be scaled to fit it. */
function useBoxSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: VIEW_H });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function PageMap() {
  const at = useAT();
  const menus = useQuery({ queryKey: ['menus'], queryFn: () => api.get<Menu[]>('/admin/menus') });
  const pages = (menus.data ?? []).filter((m) => m.menu_type === 'page' && m.is_visible);
  const [pageId, setPageId] = useState<number | null>(null);
  const page = pages.find((p) => p.id === pageId) ?? pages.find((p) => p.is_home) ?? pages[0];
  const blocksQ = useQuery({
    queryKey: ['blocks', page?.id],
    queryFn: () => api.get<Block[]>(`/admin/menus/${page!.id}/blocks`),
    enabled: !!page,
  });
  const blocks = blocksQ.data ?? [];
  const visible = blocks.filter((b) => b.is_visible);

  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [reloadKey, setReloadKey] = useState(0);
  // Full screen: the preview and the section list fill the browser window (inside the admin panel).
  const [full, setFull] = useState(false);
  const [boxRef, box] = useBoxSize();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameW = device === 'desktop' ? DESKTOP_W : PHONE_W;
  const scale = device === 'desktop' ? Math.min(1, box.w / DESKTOP_W) : 1;
  const viewH = full ? box.h : VIEW_H;

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [full]);

  const src = page ? `${page.is_home ? '/admin/preview' : `/admin/preview/${page.slug}`}?guide=1&embed=1` : null;
  const pageName = page ? pickLocalized(page.label, 'en') : '';

  /** Scrolls the preview to a section and flashes it. */
  const show = (elementId: string) => {
    const doc = frameRef.current?.contentDocument;
    const win = frameRef.current?.contentWindow;
    const el = doc?.getElementById(elementId);
    if (!doc || !win || !el) return;
    const headerH = (doc.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 80;
    win.scrollTo({ top: el.getBoundingClientRect().top + win.scrollY - headerH, behavior: 'smooth' });
    el.animate(
      [{ boxShadow: 'inset 0 0 0 8px rgba(245,158,11,0.9)' }, { boxShadow: 'inset 0 0 0 0 rgba(245,158,11,0)' }],
      { duration: 1800, easing: 'ease-out' },
    );
    boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const editHref = (b: Block) => `/admin/menus/${b.menu_id}?block=${b.id}`;

  return (
    <section id="help-pagemap" className="card p-5 sm:p-6 scroll-mt-24 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0"><i className="fa-solid fa-map" /></span>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 text-lg leading-tight">{at('Page map: what each section is and where to edit it')}</h3>
          <p className="text-sm text-slate-500 mt-1">
            {at('This is your real website (the draft) with a numbered label on every section. Each label names the block and links to the screen where you edit it.')}
          </p>
        </div>
      </div>

      {/* Preview + section list. The same elements are kept in full screen so the preview does not reload. */}
      <div
        className={full ? 'fixed inset-0 z-[70] bg-slate-50 p-3 sm:p-4 flex flex-col gap-3' : 'space-y-5'}
        role={full ? 'dialog' : undefined}
        aria-modal={full || undefined}
        aria-label={full ? at('Page map') : undefined}
      >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {full && <span className="font-bold text-slate-900 mr-2"><i className="fa-solid fa-map text-amber-600" /> {at('Page map')}</span>}
        <label className="text-sm font-semibold text-slate-600" htmlFor="pagemap-page">{at('Page')}</label>
        <select id="pagemap-page" className="input !w-auto !py-1.5 text-sm" value={page?.id ?? ''} onChange={(e) => setPageId(Number(e.target.value))}>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{pickLocalized(p.label, 'en')}{p.is_home ? ` (${at('Home')})` : ''}</option>
          ))}
        </select>
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold" role="group" aria-label={at('Screen size')}>
          {(['desktop', 'phone'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d}
              className={`px-3 py-1.5 ${device === d ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <i className={d === 'desktop' ? 'fa-solid fa-desktop' : 'fa-solid fa-mobile-screen'} /> {d === 'desktop' ? at('Computer') : at('Phone')}
            </button>
          ))}
        </div>
        <button type="button" className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => setReloadKey((k) => k + 1)}>
          <i className="fa-solid fa-rotate" /> {at('Reload')}
        </button>
        {src && !full && (
          <button type="button" className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => setFull(true)}>
            <i className="fa-solid fa-expand" /> {at('Open full screen')}
          </button>
        )}
        {src && (
          <a href={src.replace('&embed=1', '')} target="_blank" rel="noopener" className="icon-btn" title={at('Open in a new tab')} aria-label={at('Open in a new tab')}>
            <i className="fa-solid fa-up-right-from-square text-xs" />
          </a>
        )}
        {full && (
          <button type="button" className="btn-primary !py-1.5 !px-3 !text-xs ml-auto" onClick={() => setFull(false)}>
            <i className="fa-solid fa-compress" /> {at('Exit full screen')}
          </button>
        )}
      </div>

      <div className={full ? 'flex-1 min-h-0 grid grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-rows-1 md:grid-cols-[1fr_300px] gap-3' : 'grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start'}>
        {/* Live preview */}
        <div ref={boxRef} className="rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden" style={{ height: full ? '100%' : VIEW_H }}>
          {src ? (
            <div className="h-full flex justify-center">
              <div style={{ width: frameW * scale, height: viewH }}>
                <iframe
                  key={`${src}-${reloadKey}`}
                  ref={frameRef}
                  src={src}
                  title={at('Labelled preview of {page}', { page: pageName })}
                  className="bg-white border-0 block"
                  style={{ width: frameW, height: viewH / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-500 p-6 text-center">{at('Create a page in Menus & Pages to see it here.')}</div>
          )}
        </div>

        {/* Numbered legend */}
        <div className={`space-y-2 ${full ? 'min-h-0 overflow-y-auto pr-1 max-md:max-h-[40vh]' : ''}`}>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{at('Sections on this page')}</div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            <i className="fa-solid fa-arrow-up" /> {at('Header and menu bar: see the yellow strip at the top of the preview.')}
          </div>
          {visible.map((b, i) => {
            const schema = SCHEMA_BY_TYPE[b.block_type];
            const summary = summaryOf(b);
            return (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 text-xs font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                      {schema && <i className={`${schema.icon} text-brand-600 text-xs`} />} {schema ? at(schema.name) : b.block_type}
                    </div>
                    {summary && <div className="text-xs text-slate-500 truncate" title={summary}>{summary}</div>}
                    <div className="flex gap-1.5 mt-1.5">
                      <button type="button" className="btn-secondary !py-1 !px-2 !text-[11px]" onClick={() => show(`guide-block-${b.id}`)}>
                        <i className="fa-solid fa-crosshairs" /> {at('Show')}
                      </button>
                      <Link to={editHref(b)} className="btn-primary !py-1 !px-2 !text-[11px]">
                        <i className="fa-solid fa-pen" /> {at('Edit')}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {blocks.filter((b) => !b.is_visible).map((b) => {
            const schema = SCHEMA_BY_TYPE[b.block_type];
            return (
              <div key={b.id} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2.5 flex items-center gap-2 text-sm text-slate-500">
                <span className="flex-1 truncate">{schema ? at(schema.name) : b.block_type}</span>
                <Badge tone="rose">{at('Hidden')}</Badge>
                <Link to={editHref(b)} className="text-xs font-semibold text-brand-700 hover:underline">{at('Edit')}</Link>
              </div>
            );
          })}
          <button type="button" className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left text-sm text-slate-700 hover:border-amber-300" onClick={() => show('guide-footer')}>
            <i className="fa-solid fa-address-card text-brand-600 text-xs" /> <span className="font-semibold">{at('Footer')}</span>
            <span className="block text-xs text-slate-500">{at('Site settings › Footer & contact')}</span>
          </button>
        </div>
      </div>
      </div>

      {/* Main sections explained */}
      <div>
        <h4 className="font-bold text-slate-900 mb-1">{at('The main sections of the home page')}</h4>
        <p className="text-sm text-slate-500 mb-3">{at('What each section is, what visitors see and what you can change. Click Show to find it in the preview above.')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {KEY_SECTIONS.map((k) => {
            const schema = SCHEMA_BY_TYPE[k.type];
            const first = visible.find((b) => b.block_type === k.type);
            const fields = schema.fields.map((f) => at(f.label)).join(' · ');
            return (
              <div key={k.type} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><i className={schema.icon} /></span>
                  <div className="font-bold text-slate-900">{at(schema.name)}</div>
                  {first && <span className="ml-auto w-6 h-6 rounded-full bg-amber-400 text-slate-900 text-xs font-extrabold flex items-center justify-center" title={at('Number in the preview')}>{visible.indexOf(first) + 1}</span>}
                </div>
                <dl className="text-sm space-y-1.5 flex-1">
                  <div><dt className="inline font-semibold text-slate-800">{at('Where:')}</dt> <dd className="inline text-slate-600">{at(k.where)}</dd></div>
                  <div><dt className="inline font-semibold text-slate-800">{at('Visitors see:')}</dt> <dd className="inline text-slate-600">{at(k.sees)}</dd></div>
                  <div><dt className="inline font-semibold text-slate-800">{at('You can change:')}</dt> <dd className="inline text-slate-600">{fields}</dd></div>
                  <div><dt className="inline font-semibold text-slate-800">{at('Edit in:')}</dt> <dd className="inline text-slate-600">{at('Menus & Pages › {page} › Edit content › {block}', { page: pageName || at('Home'), block: at(schema.name) })}</dd></div>
                </dl>
                <div className="flex gap-1.5 mt-3">
                  {first ? (
                    <>
                      <button type="button" className="btn-secondary !py-1 !px-2.5 !text-xs" onClick={() => show(`guide-block-${first.id}`)}>
                        <i className="fa-solid fa-crosshairs" /> {at('Show')}
                      </button>
                      <Link to={editHref(first)} className="btn-primary !py-1 !px-2.5 !text-xs"><i className="fa-solid fa-pen" /> {at('Edit')}</Link>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">{at('Not on this page. Add it with Add block in the page editor.')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
