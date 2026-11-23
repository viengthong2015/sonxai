import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import type { DashboardData } from '../lib/types';
import { useMe } from './auth';
import { ErrorBlock, LoadingBlock, PageTitle, useDates } from './components/ui';
import { STATUS_META } from './ApplicationsPage';
import { useAT } from './i18n';

function Tile({ icon, tone, label, value, to }: { icon: string; tone: string; label: string; value: ReactNode; to: string }) {
  return (
    <Link to={to} className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${tone}`}>
        <i className={icon} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const me = useMe();
  const at = useAT();
  const { timeAgo } = useDates();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardData>('/admin/dashboard') });

  if (q.isPending) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const d = q.data;

  return (
    <>
      <PageTitle
        title={at('Welcome back, {name}', { name: me.data?.full_name || me.data?.username || '' })}
        subtitle={at('Manage the menus, pages and content of the Sonxai Primary School website.')}
      />

      {d.has_changes && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <i className="fa-solid fa-circle-exclamation text-amber-500 text-xl" />
          <div className="flex-1 text-sm text-amber-900">
            <strong>{at('You have unpublished changes.')}</strong> {at('Visitors will not see them until you publish.')}
          </div>
          <Link to="/admin/publish" className="btn-primary">{at('Review & publish')}</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Tile icon="fa-solid fa-bars-staggered" tone="bg-brand-50 text-brand-600" label={at('Menu items')} value={d.menus} to="/admin/menus" />
        <Tile icon="fa-solid fa-layer-group" tone="bg-hibiscus-50 text-hibiscus-600" label={at('Content blocks')} value={d.blocks} to="/admin/menus" />
        <Tile icon="fa-solid fa-inbox" tone="bg-amber-50 text-amber-600" label={at('New applications')} value={d.applications_new} to="/admin/applications" />
        <Tile
          icon={d.has_changes ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-circle-check'}
          tone={d.has_changes ? 'bg-rose-50 text-rose-500' : 'bg-leaf-50 text-leaf-600'}
          label={at('Published {when}', { when: timeAgo(d.last_published_at) })}
          value={d.has_changes ? at('Draft') : at('Live')}
          to="/admin/publish"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">{at('Recent applications')}</h2>
            <Link to="/admin/applications" className="text-sm font-semibold text-brand-700 hover:underline">{at('View all')}</Link>
          </div>
          {d.recent_applications.length === 0 ? (
            <p className="px-5 py-10 text-sm text-slate-500 text-center">{at('No applications yet.')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recent_applications.map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-user" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{a.parent_name}</div>
                    <div className="text-xs text-slate-500 truncate">{a.grade || '—'} · {a.phone}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${STATUS_META[a.status].cls}`}>{at(STATUS_META[a.status].label)}</span>
                  <span className="text-xs text-slate-400 hidden sm:block w-24 text-right">{timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-slate-900 mb-1">{at('Quick actions')}</h2>
          <Link to="/admin/menus" className="btn-secondary w-full !justify-start"><i className="fa-solid fa-plus w-5 text-brand-600" /> {at('Add a menu or page')}</Link>
          <Link to="/admin/settings" className="btn-secondary w-full !justify-start"><i className="fa-solid fa-sliders w-5 text-brand-600" /> {at('Edit header & footer')}</Link>
          <Link to="/admin/languages" className="btn-secondary w-full !justify-start"><i className="fa-solid fa-language w-5 text-brand-600" /> {at('Languages & translation')}</Link>
          <a href="/admin/preview" target="_blank" rel="noopener" className="btn-secondary w-full !justify-start"><i className="fa-solid fa-eye w-5 text-brand-600" /> {at('Preview draft site')}</a>
          <a href="/" target="_blank" rel="noopener" className="btn-secondary w-full !justify-start"><i className="fa-solid fa-globe w-5 text-brand-600" /> {at('Open live website')}</a>
        </div>
      </div>
    </>
  );
}
