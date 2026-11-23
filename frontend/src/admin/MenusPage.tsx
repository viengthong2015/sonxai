import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import type { Menu, MenuInput } from '../lib/types';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, Modal, PageTitle, Spinner, Toggle, useConfirm } from './components/ui';
import { translateTexts, useMachineTranslation } from './autoTranslate';
import { msg, useAT } from './i18n';
import { useEditLanguages } from './languages';
import { useInvalidateDraft } from './publish';

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const EMPTY: MenuInput = {
  slug: '',
  label: { en: '' },
  menu_type: 'page',
  url: '',
  open_in_new_tab: false,
  is_home: false,
  is_visible: true,
  show_in_nav: true,
  meta_description: { en: '' },
};

export function MenuFormModal({ open, onClose, menu }: { open: boolean; onClose: () => void; menu: Menu | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const invalidate = useInvalidateDraft();
  const [form, setForm] = useState<MenuInput>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const languages = useEditLanguages();
  const at = useAT();
  const mt = useMachineTranslation();
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = languages.filter((l) => l.code !== 'en');
  const missing = targets.filter((l) => !(form.label[l.code] ?? '').trim() || (!!form.meta_description.en?.trim() && !(form.meta_description[l.code] ?? '').trim()));
  const autoTranslate = async () => {
    setTranslating(true);
    setError(null);
    try {
      const label = { ...form.label };
      const meta = { ...form.meta_description };
      for (const l of missing) {
        const texts: string[] = [];
        const needLabel = !(label[l.code] ?? '').trim() && !!label.en?.trim();
        const needMeta = !(meta[l.code] ?? '').trim() && !!meta.en?.trim();
        if (needLabel) texts.push(label.en!);
        if (needMeta) texts.push(meta.en!);
        const out = await translateTexts(texts, l.code);
        if (needLabel) label[l.code] = out.shift()!;
        if (needMeta) meta[l.code] = out.shift()!;
      }
      setForm((f) => ({ ...f, label, meta_description: meta }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSlugTouched(!!menu);
    setForm(
      menu
        ? {
            slug: menu.slug,
            label: { ...menu.label },
            menu_type: menu.menu_type,
            url: menu.url ?? '',
            open_in_new_tab: menu.open_in_new_tab,
            is_home: menu.is_home,
            is_visible: menu.is_visible,
            show_in_nav: menu.show_in_nav,
            meta_description: { ...(menu.meta_description ?? {}) },
          }
        : EMPTY,
    );
  }, [open, menu]);

  const save = useMutation({
    mutationFn: (body: MenuInput) => (menu ? api.put<Menu>(`/admin/menus/${menu.id}`, body) : api.post<Menu>('/admin/menus', body)),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['menus'] });
      qc.invalidateQueries({ queryKey: ['menu', saved.id] });
      invalidate();
      toast(menu ? at('Menu updated') : at('Menu created'));
      onClose();
      if (!menu && saved.menu_type === 'page') navigate(`/admin/menus/${saved.id}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const set = <K extends keyof MenuInput>(k: K, v: MenuInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate({ ...form, url: form.menu_type === 'link' ? form.url : null });
  };

  return (
    <Modal open={open} onClose={onClose} title={menu ? at('Menu settings') : at('New menu item')} size="lg">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="label">{at('Type')}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                { v: 'page', icon: 'fa-solid fa-file-lines', title: msg('Page with content'), text: msg('Opens a page you build with content blocks.') },
                { v: 'link', icon: 'fa-solid fa-link', title: msg('Link'), text: msg('Goes to another address (Facebook, a document…).') },
              ] as const
            ).map((o) => (
              <button
                type="button"
                key={o.v}
                onClick={() => set('menu_type', o.v)}
                className={`text-left p-4 rounded-2xl border-2 transition ${form.menu_type === o.v ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                  <i className={`${o.icon} text-brand-600`} /> {at(o.title)}
                </div>
                <p className="text-xs text-slate-500 mt-1">{at(o.text)}</p>
              </button>
            ))}
          </div>
        </div>

        {mt.available && targets.length > 0 && missing.length > 0 && !!form.label.en?.trim() && (
          <div className="flex justify-end -mb-2">
            <button type="button" className="btn-ghost !py-1 !text-xs text-brand-700" disabled={translating} onClick={autoTranslate}>
              {translating ? <Spinner className="w-3.5 h-3.5" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {at('Auto-translate missing labels')}
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {languages.map((l) => (
            <div key={l.code}>
              <label className="label">
                {at('Label')}
                <span className={`px-1.5 py-px rounded text-[10px] normal-case ${l.code === 'en' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'}`}>{l.short || l.code}</span>
                {l.code !== 'en' && <span className="normal-case font-normal tracking-normal text-slate-400">{l.name}</span>}
              </label>
              <input
                className="input"
                lang={l.code}
                required={l.code === 'en'}
                maxLength={80}
                value={form.label[l.code] ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    label: { ...f.label, [l.code]: v },
                    slug: l.code === 'en' && !slugTouched ? slugify(v) : f.slug,
                  }));
                }}
                placeholder={l.code === 'en' ? at('e.g. News') : form.label.en ? at('English: {text}', { text: form.label.en }) : ''}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="label">{form.menu_type === 'page' ? at('Page address') : at('Identifier')}</label>
          <div className="flex items-stretch rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-brand-500 overflow-hidden bg-white">
            {form.menu_type === 'page' && <span className="px-3 flex items-center text-sm text-slate-400 bg-slate-50 border-r border-slate-200">{at('yoursite')}/</span>}
            <input
              className="flex-1 px-3.5 py-2.5 text-sm focus:outline-none"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title={at('Lowercase letters, numbers and dashes only')}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              }}
              placeholder="news"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{at('Lowercase letters, numbers and dashes. Changing it changes the page URL.')}</p>
        </div>

        {form.menu_type === 'link' && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <label className="label">{at('Link URL')}</label>
              <input className="input" required value={form.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder={at('https://facebook.com/yourschool or /enrollment')} />
            </div>
            <div className="pb-2">
              <Toggle checked={form.open_in_new_tab} onChange={(v) => set('open_in_new_tab', v)} label={at('Open in new tab')} />
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Toggle checked={form.is_visible} onChange={(v) => set('is_visible', v)} label={at('Published on site')} />
          <Toggle checked={form.show_in_nav} onChange={(v) => set('show_in_nav', v)} label={at('Show in top menu')} disabled={!form.is_visible} />
          {form.menu_type === 'page' && <Toggle checked={form.is_home} onChange={(v) => set('is_home', v)} label={at('Use as home page')} />}
        </div>

        {form.menu_type === 'page' && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900 list-none flex items-center gap-2">
              <i className="fa-solid fa-chevron-right text-[10px] transition-transform group-open:rotate-90" /> {at('Search engine description (optional)')}
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {languages.map((l) => (
                <textarea
                  key={l.code}
                  lang={l.code}
                  className="input"
                  rows={2}
                  maxLength={300}
                  placeholder={at('{language} description', { language: l.name })}
                  value={form.meta_description[l.code] ?? ''}
                  onChange={(e) => set('meta_description', { ...form.meta_description, [l.code]: e.target.value })}
                />
              ))}
            </div>
          </details>
        )}

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 whitespace-pre-line">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>{at('Cancel')}</button>
          <button className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner className="w-4 h-4" />} {menu ? at('Save changes') : form.menu_type === 'page' ? at('Create & add content') : at('Create link')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function MenusPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const invalidate = useInvalidateDraft();
  const q = useQuery({ queryKey: ['menus'], queryFn: () => api.get<Menu[]>('/admin/menus') });
  const languages = useEditLanguages();
  const at = useAT();
  const [editing, setEditing] = useState<Menu | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const onDone = () => {
    qc.invalidateQueries({ queryKey: ['menus'] });
    invalidate();
  };

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.post<Menu[]>('/admin/menus/reorder', { ids }),
    onMutate: (ids) => {
      const prev = qc.getQueryData<Menu[]>(['menus']);
      if (prev) qc.setQueryData(['menus'], ids.map((id) => prev.find((m) => m.id === id)!));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['menus'], ctx.prev);
      toast(errorMessage(e), 'error');
    },
    onSettled: onDone,
  });

  const quickUpdate = useMutation({
    mutationFn: (m: Menu) =>
      api.put<Menu>(`/admin/menus/${m.id}`, {
        slug: m.slug, label: m.label, menu_type: m.menu_type, url: m.url, open_in_new_tab: m.open_in_new_tab,
        is_home: m.is_home, is_visible: m.is_visible, show_in_nav: m.show_in_nav, meta_description: m.meta_description,
      }),
    onSuccess: onDone,
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/admin/menus/${id}`),
    onSuccess: () => {
      onDone();
      toast(at('Menu deleted'));
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const menus = q.data ?? [];
  const move = (i: number, d: -1 | 1) => {
    const ids = menus.map((m) => m.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    reorder.mutate(ids);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageTitle
        title={at('Menus & Pages')}
        subtitle={at('These items make up the top navigation bar. Use the arrows to change their order.')}
        actions={
          <button className="btn-primary" onClick={openNew}>
            <i className="fa-solid fa-plus" /> {at('New menu item')}
          </button>
        }
      />

      {q.isPending ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : menus.length === 0 ? (
        <EmptyState icon="fa-solid fa-bars-staggered" title={at('No menu items yet')} text={at('Create your first page to start building the website.')} action={<button className="btn-primary" onClick={openNew}><i className="fa-solid fa-plus" /> {at('New menu item')}</button>} />
      ) : (
        <>
          {/* Live preview of the nav bar */}
          <div className="mb-5 card p-3 overflow-x-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">{at('Top menu preview (draft)')}</div>
            <div className="inline-flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-full border border-slate-200/60">
              {menus.filter((m) => m.is_visible && m.show_in_nav).map((m, i) => (
                <span key={m.id} className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap ${i === 0 ? 'bg-white text-brand-700 font-semibold shadow-sm' : 'text-slate-600 font-medium'}`}>
                  {m.label.en || m.label.lo}
                </span>
              ))}
            </div>
          </div>

          <div className="card divide-y divide-slate-100">
            {menus.map((m, i) => (
              <div key={m.id} className={`flex flex-col md:flex-row md:items-center gap-3 px-4 py-3.5 ${!m.is_visible ? 'bg-slate-50/80' : ''}`}>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="icon-btn" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} aria-label={at('Move up')}><i className="fa-solid fa-arrow-up text-xs" /></button>
                  <button className="icon-btn" disabled={i === menus.length - 1 || reorder.isPending} onClick={() => move(i, 1)} aria-label={at('Move down')}><i className="fa-solid fa-arrow-down text-xs" /></button>
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.menu_type === 'page' ? 'bg-brand-50 text-brand-600' : 'bg-sky-50 text-sky-600'}`}>
                    <i className={m.is_home ? 'fa-solid fa-house' : m.menu_type === 'page' ? 'fa-solid fa-file-lines' : 'fa-solid fa-link'} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-semibold ${m.is_visible ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{m.label.en || m.label.lo}</span>
                      {languages
                        .filter((l) => l.code !== 'en' && m.label[l.code])
                        .map((l) => (
                          <span key={l.code} lang={l.code} className="text-sm text-slate-400">{m.label[l.code]}</span>
                        ))}
                      {languages
                        .filter((l) => l.code !== 'en' && !m.label[l.code])
                        .map((l) => (
                          <Badge key={l.code} tone="amber">{at('No {language} label', { language: l.short || l.code })}</Badge>
                        ))}
                      {m.is_home && <Badge tone="green">{at('Home')}</Badge>}
                      {!m.is_visible && <Badge tone="rose">{at('Hidden')}</Badge>}
                      {m.is_visible && !m.show_in_nav && <Badge tone="amber">{at('Not in menu')}</Badge>}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {m.menu_type === 'page' ? `/${m.is_home ? '' : m.slug} · ${at(m.block_count === 1 ? '{n} block' : '{n} blocks', { n: m.block_count })}` : m.url}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <Toggle checked={m.is_visible} onChange={(v) => quickUpdate.mutate({ ...m, is_visible: v })} label={<span className="text-xs text-slate-500">{at('Visible')}</span>} />
                  <div className="flex items-center gap-1">
                    {m.menu_type === 'page' && (
                      <Link to={`/admin/menus/${m.id}`} className="btn-primary !py-1.5 !px-3 !text-xs">
                        <i className="fa-solid fa-pen-to-square" /> {at('Edit content')}
                      </Link>
                    )}
                    <button className="icon-btn" title={at('Menu settings')} aria-label={at('Menu settings')} onClick={() => { setEditing(m); setFormOpen(true); }}>
                      <i className="fa-solid fa-gear" />
                    </button>
                    <button
                      className="icon-btn hover:!text-rose-600"
                      title={at('Delete')}
                      aria-label={at('Delete')}
                      onClick={async () => {
                        const ok = await confirm({
                          title: at('Delete “{name}”?', { name: m.label.en || '' }),
                          message: m.menu_type === 'page' ? at('The page and its {n} content block(s) will be deleted from the draft. The live site keeps it until you publish.', { n: m.block_count }) : at('The link will be removed from the draft.'),
                          confirmLabel: at('Delete'),
                          danger: true,
                        });
                        if (ok) remove.mutate(m.id);
                      }}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <MenuFormModal open={formOpen} onClose={() => setFormOpen(false)} menu={editing} />
    </>
  );
}
