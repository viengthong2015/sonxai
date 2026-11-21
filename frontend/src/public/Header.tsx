import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLang } from '../lib/i18n';
import type { Lang, NavItem } from '../lib/types';
import { isSafeUrl } from '../lib/url';
import { SmartLink } from './SmartLink';
import { pageHref, useSite } from './SiteContext';

export function Logo({ onDark = false }: { onDark?: boolean }) {
  const { site, base } = useSite();
  const { t } = useLang();
  const s = site.settings;
  return (
    <Link to={base || '/'} className="flex items-center gap-3 shrink-0">
      {isSafeUrl(s.logo_image_url) && s.logo_image_url ? (
        <img src={s.logo_image_url} alt="" className="w-12 h-12 object-contain" />
      ) : (
        <span className="w-12 h-12 rounded-full bg-lapis-700 text-white flex items-center justify-center text-xl">
          <i className={s.logo_icon || 'fa-solid fa-graduation-cap'} />
        </span>
      )}
      <span className="flex flex-col leading-tight">
        <span className={`font-display font-bold text-xl ${onDark ? 'text-white' : 'text-ink'}`}>{t(s.site_name)}</span>
        <span className={`text-sm ${onDark ? 'text-lapis-200' : 'text-ink-muted'}`}>{t(s.site_tagline)}</span>
      </span>
    </Link>
  );
}

/** Two-option switch: both languages always visible, the active one filled. */
function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  const opts: { code: Lang; label: string; full: string }[] = [
    { code: 'en', label: 'EN', full: 'English' },
    { code: 'lo', label: 'ລາວ', full: 'ພາສາລາວ' },
  ];
  return (
    <div className={`inline-flex rounded-full border-2 border-rule p-0.5 ${className}`} role="group" aria-label="Language">
      {opts.map((o) => (
        <button
          key={o.code}
          type="button"
          lang={o.code}
          aria-pressed={lang === o.code}
          title={o.full}
          onClick={() => setLang(o.code)}
          className={`min-w-[3rem] px-3 py-1 rounded-full text-[15px] font-bold transition-colors ${
            lang === o.code ? 'bg-lapis-700 text-white' : 'text-ink-soft hover:text-lapis-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NavEntry({ item, mobile }: { item: NavItem; mobile?: boolean }) {
  const { base } = useSite();
  const { t } = useLang();
  const desktop = 'relative py-2 text-[15px] font-bold whitespace-nowrap transition-colors';
  const desktopIdle = `${desktop} text-ink-soft hover:text-lapis-700`;
  const desktopActive = `${desktop} text-lapis-800 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-marigold-500`;
  const mobileBase = 'flex items-center justify-between py-3.5 text-lg font-bold border-b border-rule';
  const mobileIdle = `${mobileBase} text-ink`;
  const mobileActive = `${mobileBase} text-lapis-700`;

  if (item.menu_type === 'link') {
    return (
      <SmartLink href={item.url} newTab={item.open_in_new_tab} className={mobile ? mobileIdle : desktopIdle}>
        {t(item.label)}
        {item.open_in_new_tab && <i className="fa-solid fa-arrow-up-right-from-square text-[11px] ml-1.5 opacity-60" aria-label="(opens in a new tab)" />}
      </SmartLink>
    );
  }
  return (
    <NavLink
      to={pageHref(base, item.slug, item.is_home)}
      end
      className={({ isActive }) => (mobile ? (isActive ? mobileActive : mobileIdle) : isActive ? desktopActive : desktopIdle)}
    >
      {t(item.label)}
    </NavLink>
  );
}

export function Header() {
  const { site } = useSite();
  const { t, ui } = useLang();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const s = site.settings;
  const staffLabel = t(s.dashboard_label) || ui('dashboard');

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-rule">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between gap-6">
        <Logo />

        <nav className="hidden lg:flex items-center gap-7" aria-label="Main">
          {site.nav.map((item) => (
            <NavEntry key={item.slug} item={item} />
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <LangSwitch />
          {s.show_dashboard_button && (
            <Link to="/admin" className="text-[15px] font-bold text-ink-muted hover:text-lapis-700 flex items-center gap-2">
              <i className="fa-regular fa-user" aria-hidden="true" />
              {staffLabel}
            </Link>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <LangSwitch />
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-11 h-11 rounded-full text-ink hover:bg-mist flex items-center justify-center"
            aria-label={ui('toggle_nav')}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'} text-xl`} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="lg:hidden bg-white border-t border-rule px-5 sm:px-8 pb-6 max-h-[calc(100vh-76px)] overflow-y-auto" aria-label="Main">
          {site.nav.map((item) => (
            <NavEntry key={item.slug} item={item} mobile />
          ))}
          {s.show_dashboard_button && (
            <Link to="/admin" className="mt-5 inline-flex items-center gap-2 font-bold text-ink-muted">
              <i className="fa-regular fa-user" aria-hidden="true" /> {staffLabel}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
