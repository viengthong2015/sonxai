import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { pickLocalized } from '../lib/i18n';
import { useToast } from '../lib/toast';
import type { Block, BlockData, BlockType, Lang, Menu } from '../lib/types';
import { BLOCK_SCHEMAS, SCHEMA_BY_TYPE } from './blockSchemas';
import { Badge, EmptyState, ErrorBlock, LangSwitch, LoadingBlock, Modal, Spinner, Toggle, useConfirm } from './components/ui';
import { FieldsForm } from './fields';
import { MenuFormModal } from './MenusPage';
import { useInvalidateDraft } from './publish';

function BlockPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: BlockType) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Add a content block" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BLOCK_SCHEMAS.map((s) => (
          <button
            key={s.type}
            type="button"
            onClick={() => onPick(s.type)}
            className="text-left p-4 rounded-2xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 transition flex gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <i className={s.icon} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
              <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function InsertHere({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative h-6 flex items-center justify-center">
      <div className="absolute inset-x-6 top-1/2 h-px bg-transparent group-hover:bg-brand-200 transition" />
      <button
        type="button"
        onClick={onClick}
        className="relative z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition px-3 py-0.5 rounded-full bg-white border border-brand-200 text-brand-700 text-xs font-semibold shadow-sm"
      >
        <i className="fa-solid fa-plus mr-1" /> Insert block here
      </button>
    </div>
  );
}

interface BlockCardProps {
  block: Block;
  index: number;
  total: number;
  open: boolean;
  lang: Lang;
  onToggleOpen: () => void;
  onMove: (dir: -1 | 1) => void;
  onDirty: (id: number, dirty: boolean) => void;
  busy: boolean;
}

function BlockCard({ block, index, total, open, lang, onToggleOpen, onMove, onDirty, busy }: BlockCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const invalidate = useInvalidateDraft();
  const schema = SCHEMA_BY_TYPE[block.block_type];
  const [draft, setDraft] = useState<BlockData>(block.data);
  const dirty = JSON.stringify(draft) !== JSON.stringify(block.data);

  // Pick up server changes when there is nothing unsaved locally.
  useEffect(() => {
    if (!dirty) setDraft(block.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.updated_at]);

  useEffect(() => {
    onDirty(block.id, dirty);
  }, [dirty, block.id, onDirty]);
  useEffect(() => () => onDirty(block.id, false), [block.id, onDirty]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['blocks', block.menu_id] });
    qc.invalidateQueries({ queryKey: ['menus'] });
    invalidate();
  };

  const save = useMutation({
    mutationFn: (body: { data?: BlockData; is_visible?: boolean }) => api.put<Block>(`/admin/blocks/${block.id}`, body),
    onSuccess: (saved, vars) => {
      qc.setQueryData<Block[]>(['blocks', block.menu_id], (old) => old?.map((b) => (b.id === saved.id ? saved : b)));
      if (vars.data) {
        setDraft(saved.data);
        toast('Block saved. Publish when you are ready to go live.');
      }
      invalidate();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const duplicate = useMutation({
    mutationFn: () => api.post<Block>(`/admin/blocks/${block.id}/duplicate`),
    onSuccess: () => {
      refresh();
      toast('Block duplicated');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: () => api.del(`/admin/blocks/${block.id}`),
    onSuccess: () => {
      refresh();
      toast('Block deleted');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const summary = schema ? pickLocalized(draft[schema.summaryKey], lang) : '';

  const toggle = async () => {
    if (open && dirty) {
      const ok = await confirm({ title: 'Discard unsaved changes?', message: 'Your edits to this block have not been saved.', confirmLabel: 'Discard', danger: true });
      if (!ok) return;
      setDraft(block.data);
    }
    onToggleOpen();
  };

  return (
    <div className={`card transition ${open ? 'ring-2 ring-brand-500/30 border-brand-200' : ''} ${!block.is_visible ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2 px-3 sm:px-4 py-3">
        <button type="button" onClick={toggle} className="flex-1 flex items-center gap-3 min-w-0 text-left">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <i className={schema?.icon ?? 'fa-solid fa-cube'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm">{schema?.name ?? block.block_type}</span>
              {!block.is_visible && <Badge tone="rose">Hidden</Badge>}
              {dirty && <Badge tone="amber">Unsaved</Badge>}
            </div>
            <div className="text-xs text-slate-500 truncate">{summary || schema?.description}</div>
          </div>
        </button>
        <div className="hidden sm:block">
          <Toggle checked={block.is_visible} onChange={(v) => save.mutate({ is_visible: v })} />
        </div>
        <button className="icon-btn" disabled={index === 0 || busy} onClick={() => onMove(-1)} aria-label="Move up" title="Move up"><i className="fa-solid fa-arrow-up text-xs" /></button>
        <button className="icon-btn" disabled={index === total - 1 || busy} onClick={() => onMove(1)} aria-label="Move down" title="Move down"><i className="fa-solid fa-arrow-down text-xs" /></button>
        <button className="icon-btn hidden sm:inline-flex" onClick={() => duplicate.mutate()} disabled={duplicate.isPending} aria-label="Duplicate" title="Duplicate"><i className="fa-regular fa-copy text-sm" /></button>
        <button
          className="icon-btn hover:!text-rose-600"
          aria-label="Delete"
          title="Delete"
          onClick={async () => {
            if (await confirm({ title: `Delete this ${schema?.name ?? 'block'}?`, message: 'It will be removed from the draft. You can restore older versions from History.', confirmLabel: 'Delete', danger: true }))
              remove.mutate();
          }}
        >
          <i className="fa-solid fa-trash text-sm" />
        </button>
        <button className="icon-btn" onClick={toggle} aria-label={open ? 'Collapse' : 'Edit'} aria-expanded={open}>
          <i className={`fa-solid fa-chevron-down text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && schema && (
        <div className="border-t border-slate-100 px-4 sm:px-6 py-5 space-y-5">
          <FieldsForm fields={schema.fields} value={draft} onChange={setDraft} lang={lang} />
          <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-1">
            <span className="text-xs text-slate-400 mr-auto sm:hidden">
              <Toggle checked={block.is_visible} onChange={(v) => save.mutate({ is_visible: v })} label="Visible" />
            </span>
            <button className="btn-ghost" disabled={!dirty || save.isPending} onClick={() => setDraft(block.data)}>Discard</button>
            <button className="btn-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate({ data: draft })}>
              {save.isPending ? <Spinner className="w-4 h-4" /> : <i className="fa-solid fa-floppy-disk" />} Save block
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PageEditor() {
  const { id } = useParams();
  const menuId = Number(id);
  const qc = useQueryClient();
  const toast = useToast();
  const invalidate = useInvalidateDraft();
  const [lang, setLang] = useState<Lang>('en');
  const [openId, setOpenId] = useState<number | null>(null);
  const [pickerAt, setPickerAt] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());

  const menuQ = useQuery({ queryKey: ['menu', menuId], queryFn: () => api.get<Menu>(`/admin/menus/${menuId}`), enabled: Number.isFinite(menuId) });
  const blocksQ = useQuery({ queryKey: ['blocks', menuId], queryFn: () => api.get<Block[]>(`/admin/menus/${menuId}/blocks`), enabled: Number.isFinite(menuId) });

  const onDirty = useCallback((bid: number, dirty: boolean) => {
    setDirtyIds((prev) => {
      if (prev.has(bid) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(bid);
      else next.delete(bid);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!dirtyIds.size) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyIds]);

  useEffect(() => {
    if (menuQ.data) document.title = `${menuQ.data.label.en || menuQ.data.slug} | Sonxai CMS`;
  }, [menuQ.data]);

  const create = useMutation({
    mutationFn: ({ type, position }: { type: BlockType; position: number }) =>
      api.post<Block>(`/admin/menus/${menuId}/blocks`, { block_type: type, data: SCHEMA_BY_TYPE[type].defaults(), position }),
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['blocks', menuId] });
      qc.invalidateQueries({ queryKey: ['menus'] });
      invalidate();
      setOpenId(b.id);
      toast('Block added. Fill it in and save.');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.post<Block[]>(`/admin/menus/${menuId}/blocks/reorder`, { ids }),
    onMutate: (ids) => {
      const prev = qc.getQueryData<Block[]>(['blocks', menuId]);
      if (prev) qc.setQueryData(['blocks', menuId], ids.map((bid) => prev.find((b) => b.id === bid)!));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['blocks', menuId], ctx.prev);
      toast(errorMessage(e), 'error');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['blocks', menuId] });
      invalidate();
    },
  });

  if (menuQ.isPending || blocksQ.isPending) return <LoadingBlock />;
  if (menuQ.isError) return <ErrorBlock message={errorMessage(menuQ.error)} />;
  if (blocksQ.isError) return <ErrorBlock message={errorMessage(blocksQ.error)} onRetry={() => blocksQ.refetch()} />;

  const menu = menuQ.data;
  const blocks = blocksQ.data;
  const previewHref = menu.is_home ? '/admin/preview' : `/admin/preview/${menu.slug}`;

  if (menu.menu_type !== 'page') {
    return (
      <EmptyState
        icon="fa-solid fa-link"
        title="This menu item is a link"
        text={`It points to ${menu.url}. Links do not have page content.`}
        action={<Link to="/admin/menus" className="btn-secondary">Back to menus</Link>}
      />
    );
  }

  const move = (i: number, d: -1 | 1) => {
    const ids = blocks.map((b) => b.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <>
      <div className="mb-6">
        <Link to="/admin/menus" className="text-sm font-semibold text-slate-500 hover:text-brand-700">
          <i className="fa-solid fa-arrow-left mr-1.5" /> All menus
        </Link>
        <div className="mt-3 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{menu.label.en || menu.label.lo}</h1>
              {menu.is_home && <Badge tone="green">Home page</Badge>}
              {!menu.is_visible && <Badge tone="rose">Hidden</Badge>}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              /{menu.is_home ? '' : menu.slug} · {blocks.length} block{blocks.length === 1 ? '' : 's'} · Changes are saved as a draft until you publish.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LangSwitch lang={lang} onChange={setLang} />
            <button className="btn-secondary" onClick={() => setSettingsOpen(true)}><i className="fa-solid fa-gear" /> Settings</button>
            <a href={previewHref} target="_blank" rel="noopener" className="btn-secondary"><i className="fa-solid fa-eye" /> Preview</a>
          </div>
        </div>
      </div>

      {lang === 'lo' && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-sm text-amber-900">
          <i className="fa-solid fa-language mr-2" /> Editing <strong>Lao</strong> text. Empty Lao fields fall back to English on the website.
        </div>
      )}

      {blocks.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-layer-group"
          title="This page is empty"
          text="Pages are built from content blocks: banners, text, cards, forms and more."
          action={<button className="btn-primary" onClick={() => setPickerAt(0)}><i className="fa-solid fa-plus" /> Add the first block</button>}
        />
      ) : (
        <div>
          {blocks.map((b, i) => (
            <div key={b.id}>
              {i > 0 && <InsertHere onClick={() => setPickerAt(i)} />}
              {i === 0 && <div className="h-0" />}
              <BlockCard
                block={b}
                index={i}
                total={blocks.length}
                open={openId === b.id}
                lang={lang}
                onToggleOpen={() => setOpenId(openId === b.id ? null : b.id)}
                onMove={(d) => move(i, d)}
                onDirty={onDirty}
                busy={reorder.isPending}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPickerAt(blocks.length)}
            className="mt-4 w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-brand-500 hover:text-brand-700 hover:bg-brand-50/40 transition"
          >
            {create.isPending ? <Spinner className="w-4 h-4" /> : <i className="fa-solid fa-plus mr-1.5" />} Add block
          </button>
        </div>
      )}

      <BlockPicker
        open={pickerAt !== null}
        onClose={() => setPickerAt(null)}
        onPick={(type) => {
          create.mutate({ type, position: pickerAt ?? blocks.length });
          setPickerAt(null);
        }}
      />
      <MenuFormModal open={settingsOpen} onClose={() => setSettingsOpen(false)} menu={menu} />
    </>
  );
}
