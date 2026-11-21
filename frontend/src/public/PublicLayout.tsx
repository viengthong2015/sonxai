import { useQuery } from '@tanstack/react-query';
import { Link, Outlet } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useLang } from '../lib/i18n';
import type { SiteData } from '../lib/types';
import { ApplyModal } from './ApplyModal';
import { Footer } from './Footer';
import { Header } from './Header';
import { SiteProvider, type SiteMode } from './SiteContext';

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 rounded-full border-4 border-lapis-100 border-t-lapis-700 animate-spin motion-reduce:animate-none" role="status" aria-label="Loading" />
    </div>
  );
}

function PreviewBanner() {
  return (
    <div className="bg-marigold-400 text-ink text-sm font-semibold font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-eye" /> Preview mode: you are viewing the unpublished draft.
        </span>
        <Link to="/admin" className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:no-underline">
          <i className="fa-solid fa-arrow-left text-xs" /> Back to admin
        </Link>
      </div>
    </div>
  );
}

function StatusScreen({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  const { ui } = useLang();
  return (
    <div className="school min-h-screen board text-white flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <img src="/logo.png" alt="" className="w-24 h-24 mx-auto" />
        <h1 className="text-3xl text-white">{title}</h1>
        <p className="text-lapis-100">{text}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-apply">
            {ui('retry')}
          </button>
        )}
      </div>
    </div>
  );
}

export function PublicLayout({ mode }: { mode: SiteMode }) {
  const { ui } = useLang();
  const q = useQuery({
    queryKey: ['site', mode],
    queryFn: () => api.get<SiteData>(mode === 'preview' ? '/admin/preview/site' : '/public/site'),
  });

  if (q.isPending) return <FullPageSpinner />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 503) {
      return <StatusScreen title={ui('coming_soon')} text={ui('coming_soon_text')} />;
    }
    return <StatusScreen title="Sonxai" text={ui('load_error')} onRetry={() => q.refetch()} />;
  }

  return (
    <SiteProvider site={q.data} mode={mode}>
      <div className="school min-h-screen flex flex-col bg-white">
        {mode === 'preview' && <PreviewBanner />}
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <ApplyModal />
    </SiteProvider>
  );
}
