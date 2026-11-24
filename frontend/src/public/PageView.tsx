import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useLang } from '../lib/i18n';
import type { Menu, PageData } from '../lib/types';
import { BlockRenderer } from './blocks/BlockRenderer';
import { useSite } from './SiteContext';

export function NotFound() {
  const { ui } = useLang();
  const { base } = useSite();
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-xl">
          <h1 className="text-4xl sm:text-5xl text-ink">{ui('not_found')}</h1>
          <p className="mt-4 text-lg text-ink-soft">{ui('not_found_text')}</p>
          <Link to={base || '/'} className="btn-apply mt-8">{ui('back_home')}</Link>
        </div>
      </div>
    </section>
  );
}

export function PageView() {
  const { slug } = useParams();
  const { mode, site, guide } = useSite();
  const { t, ui } = useLang();
  // Guide mode needs the page's menu id for "Edit this block" links (preview requires admin login).
  const menus = useQuery({ queryKey: ['menus'], queryFn: () => api.get<Menu[]>('/admin/menus'), enabled: guide });

  const prefix = mode === 'preview' ? '/admin/preview' : '/public';
  const q = useQuery({
    queryKey: ['page', mode, slug ?? '__home__'],
    queryFn: () => api.get<PageData>(slug ? `${prefix}/pages/${encodeURIComponent(slug)}` : `${prefix}/home`),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    const siteName = `${t(site.settings.site_name)} ${t(site.settings.site_tagline)}`.trim();
    if (q.data) {
      document.title = q.data.is_home ? siteName : `${t(q.data.label)} | ${siteName}`;
      const desc = t(q.data.meta_description) || t(site.settings.meta_description);
      document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    }
  }, [q.data, site, t]);

  if (q.isPending) {
    return (
      <div className="py-40 flex justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-lapis-100 border-t-lapis-700 animate-spin motion-reduce:animate-none" role="status" aria-label="Loading" />
      </div>
    );
  }
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404) return <NotFound />;
    return (
      <div className="py-32 text-center space-y-4">
        <p className="text-ink-soft">{ui('load_error')}</p>
        <button onClick={() => q.refetch()} className="btn-apply">{ui('retry')}</button>
      </div>
    );
  }
  const page = q.data;
  const menu = menus.data?.find((m) => (page.is_home ? m.is_home : m.slug === page.slug));
  return <BlockRenderer blocks={page.blocks} guide={guide ? { menuId: menu?.id, pageLabel: t(page.label) } : undefined} />;
}
