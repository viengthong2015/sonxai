import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import type { Application, ApplicationStatus } from '../lib/types';
import { EmptyState, ErrorBlock, LoadingBlock, Modal, PageTitle, Spinner, formatDate, timeAgo, useConfirm } from './components/ui';

export const STATUS_META: Record<ApplicationStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-amber-100 text-amber-800' },
  contacted: { label: 'Contacted', cls: 'bg-sky-50 text-sky-700' },
  enrolled: { label: 'Enrolled', cls: 'bg-brand-50 text-brand-700' },
  archived: { label: 'Archived', cls: 'bg-slate-100 text-slate-500' },
};
const STATUSES = Object.keys(STATUS_META) as ApplicationStatus[];
const PAGE = 25;

function DetailModal({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState<ApplicationStatus>('new');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (app) {
      setStatus(app.status);
      setNotes(app.admin_notes);
    }
  }, [app]);

  const done = () => {
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const save = useMutation({
    mutationFn: () => api.patch(`/admin/applications/${app!.id}`, { status, admin_notes: notes }),
    onSuccess: () => {
      done();
      toast('Application updated');
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/admin/applications/${app!.id}`),
    onSuccess: () => {
      done();
      toast('Application deleted');
      onClose();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal
      open={!!app}
      onClose={onClose}
      title="Application details"
      footer={
        <>
          <button
            className="btn-ghost text-rose-600 mr-auto"
            onClick={async () => {
              if (await confirm({ title: 'Delete this application?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) remove.mutate();
            }}
          >
            <i className="fa-solid fa-trash" /> Delete
          </button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner className="w-4 h-4" />} Save
          </button>
        </>
      }
    >
      {app && (
        <div className="space-y-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><dt className="label">Parent / guardian</dt><dd className="text-slate-800 font-medium">{app.parent_name}</dd></div>
            <div>
              <dt className="label">Phone</dt>
              <dd><a className="text-brand-700 font-medium hover:underline" href={`tel:${app.phone.replace(/[^0-9+]/g, '')}`}>{app.phone}</a></dd>
            </div>
            <div><dt className="label">Child</dt><dd className="text-slate-800">{app.child_name || '—'}</dd></div>
            <div><dt className="label">Grade</dt><dd className="text-slate-800">{app.grade || '—'}</dd></div>
            <div className="sm:col-span-2"><dt className="label">Message</dt><dd className="text-slate-700 whitespace-pre-line">{app.message || '—'}</dd></div>
            <div className="sm:col-span-2 text-xs text-slate-400">Received {formatDate(app.created_at)}</div>
          </dl>
          <div>
            <span className="label">Status</span>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border-2 transition ${status === s ? `${STATUS_META[s].cls} border-current` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="app-notes">Internal notes</label>
            <textarea id="app-notes" className="input" rows={3} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only visible to administrators" />
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ApplicationsPage() {
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Application | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (status) params.set('status', status);
  if (query) params.set('q', query);

  const q = useQuery({
    queryKey: ['applications', status, query, offset],
    queryFn: () => api.get<{ items: Application[]; total: number }>(`/admin/applications?${params}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageTitle title="Applications" subtitle="Admission requests sent from the website." />
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="inline-flex flex-wrap gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['', ...STATUSES] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setStatus(s); setOffset(0); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${status === s ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {s ? STATUS_META[s].label : 'All'}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input className="input !pl-10" placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {q.isPending ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState icon="fa-solid fa-inbox" title="No applications" text={status || query ? 'Try a different filter.' : 'Requests sent from the website will appear here.'} />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 hidden md:table-cell">Child / grade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {q.data.items.map((a) => (
                  <tr key={a.id} onClick={() => setSelected(a)} className="cursor-pointer hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-semibold text-slate-800">{a.parent_name}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{a.phone}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{[a.child_name, a.grade].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${STATUS_META[a.status].cls}`}>{STATUS_META[a.status].label}</span></td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell whitespace-nowrap" title={formatDate(a.created_at)}>{timeAgo(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>
              {offset + 1}–{Math.min(offset + PAGE, q.data.total)} of {q.data.total}
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary !py-1.5" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
              <button className="btn-secondary !py-1.5" disabled={offset + PAGE >= q.data.total} onClick={() => setOffset(offset + PAGE)}>Next</button>
            </div>
          </div>
        </>
      )}
      <DetailModal app={selected} onClose={() => setSelected(null)} />
    </>
  );
}
