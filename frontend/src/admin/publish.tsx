import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import type { PublishStatus } from '../lib/types';
import { Modal, Spinner, timeAgo } from './components/ui';

export function usePublishStatus() {
  return useQuery({
    queryKey: ['publish-status'],
    queryFn: () => api.get<PublishStatus>('/admin/publish/status'),
    refetchInterval: 60_000,
  });
}

/** Invalidate everything that depends on draft content. Call after any content mutation. */
export function useInvalidateDraft() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['publish-status'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['site', 'preview'] });
    qc.invalidateQueries({ queryKey: ['page', 'preview'] });
  };
}

export function ChangeSummary({ status }: { status: PublishStatus }) {
  if (!status.has_changes) return <p className="text-sm text-slate-500">The live website matches the draft. Nothing to publish.</p>;
  const rows: { icon: string; tone: string; text: string }[] = [
    ...status.added.map((l) => ({ icon: 'fa-plus', tone: 'text-brand-600', text: `New menu: ${l}` })),
    ...status.modified.map((l) => ({ icon: 'fa-pen', tone: 'text-amber-600', text: `Changed: ${l}` })),
    ...status.removed.map((l) => ({ icon: 'fa-minus', tone: 'text-rose-600', text: `Removed: ${l}` })),
  ];
  if (status.order_changed) rows.push({ icon: 'fa-arrow-down-up-across-line', tone: 'text-sky-600', text: 'Menu order changed' });
  if (status.settings_changed && !status.never_published) rows.push({ icon: 'fa-gear', tone: 'text-violet-600', text: 'Site settings changed' });
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
          <span className={`w-5 text-center ${r.tone}`}>
            <i className={`fa-solid ${r.icon} text-xs`} />
          </span>
          {r.text}
        </li>
      ))}
    </ul>
  );
}

export function PublishDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const status = usePublishStatus();
  const qc = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState('');

  const publish = useMutation({
    mutationFn: () => api.post('/admin/publish', { note }),
    onSuccess: () => {
      toast('Published! Your changes are now live.');
      setNote('');
      qc.invalidateQueries({ queryKey: ['publish-status'] });
      qc.invalidateQueries({ queryKey: ['publications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['site', 'live'] });
      qc.invalidateQueries({ queryKey: ['page', 'live'] });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish changes"
      footer={
        <>
          <a href="/admin/preview" target="_blank" rel="noopener" className="btn-secondary mr-auto">
            <i className="fa-solid fa-eye" /> Preview draft
          </a>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={publish.isPending || !status.data?.has_changes} onClick={() => publish.mutate()}>
            {publish.isPending ? <Spinner className="w-4 h-4" /> : <i className="fa-solid fa-rocket" />} Publish now
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Changes since last publish</div>
          {status.data ? <ChangeSummary status={status.data} /> : <Spinner />}
        </div>
        <div>
          <label className="label" htmlFor="pub-note">Note (optional)</label>
          <input id="pub-note" className="input" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Updated enrollment dates" />
          <p className="text-xs text-slate-400 mt-1.5">
            Last published {timeAgo(status.data?.last_published_at)}
            {status.data?.last_published_by ? ` by ${status.data.last_published_by}` : ''}. Every publish is saved in History and can be restored.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function PublishButton() {
  const status = usePublishStatus();
  const [open, setOpen] = useState(false);
  const pending = status.data?.has_changes;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={pending ? 'btn-primary relative' : 'btn-secondary'}
        title={pending ? 'You have unpublished changes' : 'Everything is published'}
      >
        {pending ? (
          <>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white" />
            <i className="fa-solid fa-rocket" /> Publish
          </>
        ) : (
          <>
            <i className="fa-solid fa-circle-check text-brand-600" /> <span className="hidden sm:inline">Published</span>
          </>
        )}
      </button>
      <PublishDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
