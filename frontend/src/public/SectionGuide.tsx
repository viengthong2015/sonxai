/**
 * Guide mode for the draft preview (/admin/preview?guide=1).
 *
 * Outlines every part of the public page and labels it with the admin screen that edits it,
 * so staff can see how the website is put together. Only used in preview mode, which already
 * requires an administrator session.
 */
import type { ReactNode } from 'react';
import { SCHEMA_BY_TYPE } from '../admin/blockSchemas';
import { useAT } from '../admin/i18n';
import type { PageBlock } from '../lib/types';

const OUTLINE = { outline: '3px dashed #f59e0b', outlineOffset: '-3px' } as const;

function EditLink({ to, children }: { to: string; children: ReactNode }) {
  // target=_top: when the preview is shown inside the User manual, open the editor in the admin window.
  return (
    <a href={to} target="_top" className="inline-flex items-center gap-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-900 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap">
      {children} <i className="fa-solid fa-arrow-right text-[9px]" />
    </a>
  );
}

/** Wraps one content block with an outline and a label. */
export function GuideBlock({ block, index, menuId, pageLabel, children }: {
  block: PageBlock;
  index: number;
  menuId?: number;
  pageLabel: string;
  children: ReactNode;
}) {
  const at = useAT();
  const schema = SCHEMA_BY_TYPE[block.block_type];
  return (
    <div id={`guide-block-${block.id}`} data-guide-type={block.block_type} className="relative" style={OUTLINE}>
      <div className="absolute left-2 top-2 sm:left-3 sm:top-3 z-40 max-w-[calc(100%-1rem)] font-sans not-italic">
        <div className="rounded-xl bg-slate-900/90 text-white shadow-lg px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 text-xs font-extrabold flex items-center justify-center shrink-0">{index}</span>
            {schema && <i className={`${schema.icon} text-amber-300 text-sm`} />}
            <span className="font-bold text-sm">{schema ? at(schema.name) : block.block_type}</span>
            {menuId !== undefined && <EditLink to={`/admin/menus/${menuId}?block=${block.id}`}>{at('Edit this block')}</EditLink>}
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            {at('Admin: Menus & Pages › {page} › Edit content', { page: pageLabel })}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Explains the parts of the header, shown just above it. */
export function GuideHeaderStrip() {
  const at = useAT();
  const items = [
    { icon: 'fa-solid fa-school', part: at('Logo and school name'), where: at('Site settings › Branding'), to: '/admin/settings' },
    { icon: 'fa-solid fa-bars-staggered', part: at('Menu bar'), where: at('Menus & Pages'), to: '/admin/menus' },
    { icon: 'fa-solid fa-language', part: at('Language switch'), where: at('Languages'), to: '/admin/languages' },
    { icon: 'fa-solid fa-gauge', part: at('Dashboard button'), where: at('Site settings › Header'), to: '/admin/settings' },
  ];
  return (
    <div className="bg-amber-50 border-y-2 border-dashed border-amber-400 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1.5">
          <i className="fa-solid fa-arrow-down" /> {at('Header (the bar below, shown on every page)')}
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((it) => (
            <a key={it.part} href={it.to} target="_top" className="inline-flex items-center gap-2 rounded-lg bg-white border border-amber-200 hover:border-amber-400 px-2.5 py-1 text-xs">
              <i className={`${it.icon} text-amber-600`} />
              <span className="font-semibold">{it.part}</span>
              <span className="text-slate-500">→ {it.where}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Wraps the footer with an outline and a label. */
export function GuideFooter({ children }: { children: ReactNode }) {
  const at = useAT();
  return (
    <div id="guide-footer" className="relative" style={OUTLINE}>
      <div className="absolute left-2 top-2 sm:left-3 sm:top-3 z-40 font-sans">
        <div className="rounded-xl bg-slate-900/90 text-white shadow-lg px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <i className="fa-solid fa-address-card text-amber-300 text-sm" />
            <span className="font-bold text-sm">{at('Footer')}</span>
            <EditLink to="/admin/settings">{at('Site settings')}</EditLink>
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5">
            {at('Name, text, contact details and social links: Site settings › Footer & contact. Page links: Menus & Pages.')}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
