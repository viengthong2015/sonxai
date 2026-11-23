import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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

/**
 * Language dropdown built from the languages the administrator enabled.
 * The button shows the current language; the list shows every language in its own name.
 * Keyboard: Enter/Space/↓ opens, ↑/↓ move, Enter selects, Escape closes.
 */
function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, languages } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = languages.find((l) => l.code === lang) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, languages.findIndex((l) => l.code === lang)));
    listRef.current?.focus();
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, languages, lang]);

  if (languages.length < 2 || !current) return null;

  const choose = (code: Lang) => {
    setLang(code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((i) => Math.min(languages.length - 1, i + 1));
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(languages.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(languages[active].code);
    else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      if (e.key === 'Escape') buttonRef.current?.focus();
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.name}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex items-center gap-2 rounded-full border-2 border-rule bg-white pl-3 pr-3.5 py-1.5 text-[15px] font-bold text-ink hover:border-lapis-300 transition-colors"
      >
        <i className="fa-solid fa-globe text-lapis-700" aria-hidden="true" />
        <span lang={current.code}>{current.short || current.code.toUpperCase()}</span>
        <i className={`fa-solid fa-chevron-down text-[10px] text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label="Language"
          aria-activedescendant={`lang-opt-${languages[active]?.code}`}
          onKeyDown={onListKey}
          className="absolute right-0 mt-2 min-w-[12rem] max-h-[60vh] overflow-y-auto rounded-xl border border-rule bg-white py-1.5 shadow-xl z-50 focus:outline-none"
        >
          {languages.map((l, i) => {
            const selected = l.code === lang;
            return (
              <li
                key={l.code}
                id={`lang-opt-${l.code}`}
                role="option"
                aria-selected={selected}
                lang={l.code}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(l.code)}
                className={`flex items-center justify-between gap-4 px-4 py-2.5 cursor-pointer text-[15px] ${
                  i === active ? 'bg-mist' : ''
                } ${selected ? 'font-bold text-lapis-700' : 'text-ink'}`}
              >
                <span>{l.name}</span>
                {selected && <i className="fa-solid fa-check text-xs text-marigold-600" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
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
