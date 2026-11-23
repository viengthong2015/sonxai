import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import type { Publication } from '../lib/types';
import { Badge, ErrorBlock, LoadingBlock, PageTitle, useConfirm, useDates } from './components/ui';
import { useAT } from './i18n';
import { ChangeSummary, PublishDialog, usePublishStatus } from './publish';

export function PublishPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const status = usePublishStatus();
  const history = useQuery({ queryKey: ['publications'], queryFn: () => api.get<Publication[]>('/admin/publications') });
  const [dialog, setDialog] = useState(false);
  const at = useAT();
  const { formatDate, timeAgo } = useDates();

  const restore = useMutation({
    mutationFn: (id: number) => api.post(`/admin/publications/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries();
      toast(at('Version restored into the draft. Review it, then publish to make it live.'));
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <>
      <PageTitle title={at('Publish & history')} subtitle={at('Your edits are saved as a draft. Publishing makes the draft visible to everyone.')} />

      <div className="card p-5 sm:p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${status.data?.has_changes ? 'bg-amber-50 text-amber-500' : 'bg-brand-50 text-brand-600'}`}>
            <i className={status.data?.has_changes ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-circle-check'} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-lg">{status.data?.has_changes ? at('Unpublished changes') : at('Everything is live')}</h2>
            <p className="text-sm text-slate-500 mb-4">
              {status.data?.last_published_by
                ? at('Last published {when} by {name}.', { when: timeAgo(status.data?.last_published_at), name: status.data.last_published_by })
                : at('Last published {when}.', { when: timeAgo(status.data?.last_published_at) })}
            </p>
            {status.data && <ChangeSummary status={status.data} />}
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <button className="btn-primary" disabled={!status.data?.has_changes} onClick={() => setDialog(true)}>
              <i className="fa-solid fa-rocket" /> {at('Publish')}
            </button>
            <a href="/admin/preview" target="_blank" rel="noopener" className="btn-secondary">
              <i className="fa-solid fa-eye" /> {at('Preview draft')}
            </a>
          </div>
        </div>
      </div>

      <h2 className="font-bold text-slate-900 mb-3">{at('History')}</h2>
      {history.isPending ? (
        <LoadingBlock />
      ) : history.isError ? (
        <ErrorBlock message={errorMessage(history.error)} onRetry={() => history.refetch()} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">{at('Version')}</th>
                <th className="px-4 py-3">{at('Note')}</th>
                <th className="px-4 py-3 hidden md:table-cell">{at('Published by')}</th>
                <th className="px-4 py-3 hidden sm:table-cell">{at('Date')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.data.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    #{p.id} {p.is_live && <Badge tone="green">{at('Live')}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.note || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{p.published_by ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell whitespace-nowrap">{formatDate(p.published_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="btn-ghost !py-1.5 !text-xs"
                      disabled={restore.isPending}
                      onClick={async () => {
                        const ok = await confirm({
                          title: at('Restore version #{id}?', { id: p.id }),
                          message: at('This replaces your current draft (menus, pages and settings) with this version. The live site does not change until you publish.'),
                          confirmLabel: at('Restore to draft'),
                          danger: true,
                        });
                        if (ok) restore.mutate(p.id);
                      }}
                    >
                      <i className="fa-solid fa-clock-rotate-left" /> {at('Restore')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PublishDialog open={dialog} onClose={() => setDialog(false)} />
    </>
  );
}
