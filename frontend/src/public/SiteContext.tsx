import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SiteData } from '../lib/types';

export type SiteMode = 'live' | 'preview';

interface SiteCtx {
  site: SiteData;
  mode: SiteMode;
  /** Base path for page links: '' on the live site, '/admin/preview' in preview. */
  base: string;
  /** Map a site path ("/about") to the correct path for the current mode. */
  resolvePath: (path: string) => string;
  openApply: () => void;
  closeApply: () => void;
  applyOpen: boolean;
}

const Ctx = createContext<SiteCtx | null>(null);

export function SiteProvider({ site, mode, children }: { site: SiteData; mode: SiteMode; children: ReactNode }) {
  const [applyOpen, setApplyOpen] = useState(false);
  const base = mode === 'preview' ? '/admin/preview' : '';

  const resolvePath = useCallback(
    (path: string) => {
      if (!base) return path;
      return path === '/' ? base : `${base}${path}`;
    },
    [base],
  );

  const value = useMemo<SiteCtx>(
    () => ({
      site,
      mode,
      base,
      resolvePath,
      applyOpen,
      openApply: () => setApplyOpen(true),
      closeApply: () => setApplyOpen(false),
    }),
    [site, mode, base, resolvePath, applyOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite(): SiteCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}

export function pageHref(base: string, slug: string, isHome: boolean): string {
  if (isHome) return base || '/';
  return `${base}/${slug}`;
}
