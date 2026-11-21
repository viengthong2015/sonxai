import { useLang } from '../lib/i18n';
import { isSafeUrl } from '../lib/url';
import { Logo } from './Header';
import { useSite } from './SiteContext';

export function Footer() {
  const { site } = useSite();
  const { t } = useLang();
  const s = site.settings;
  const address = t(s.contact_address);
  const phoneHref = s.contact_phone ? `tel:${s.contact_phone.replace(/[^0-9+]/g, '')}` : '';

  return (
    <footer className="bg-ink text-lapis-100">
      {/* The logo's page edges, as a closing rule. */}
      <div className="grid grid-rows-3 h-[15px]" aria-hidden="true">
        <span className="bg-[#5B9BE6]" />
        <span className="bg-leaf-500" />
        <span className="bg-hibiscus-600" />
      </div>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 pb-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
          <div className="max-w-sm">
            <Logo onDark />
            {t(s.meta_description) && <p className="mt-5 text-[15px] leading-relaxed text-lapis-200">{t(s.meta_description)}</p>}
          </div>

          {(address || s.contact_phone || s.contact_email) && (
            <address className="not-italic space-y-2.5 text-[15px]">
              {address && (
                <p className="flex gap-3">
                  <i className="fa-solid fa-location-dot mt-1.5 text-marigold-400 w-4" aria-hidden="true" /> {address}
                </p>
              )}
              {s.contact_phone && (
                <p className="flex gap-3">
                  <i className="fa-solid fa-phone mt-1.5 text-marigold-400 w-4" aria-hidden="true" />
                  <a href={phoneHref} className="hover:text-white underline-offset-4 hover:underline">{s.contact_phone}</a>
                </p>
              )}
              {s.contact_email && (
                <p className="flex gap-3">
                  <i className="fa-solid fa-envelope mt-1.5 text-marigold-400 w-4" aria-hidden="true" />
                  <a href={`mailto:${s.contact_email}`} className="hover:text-white underline-offset-4 hover:underline">{s.contact_email}</a>
                </p>
              )}
            </address>
          )}

          {(isSafeUrl(s.facebook_url) || isSafeUrl(s.youtube_url)) && (
            <div className="flex gap-3">
              {isSafeUrl(s.facebook_url) && (
                <a href={s.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-11 h-11 rounded-full border border-lapis-300/40 flex items-center justify-center text-lg hover:bg-white/10 hover:text-white">
                  <i className="fa-brands fa-facebook-f" />
                </a>
              )}
              {isSafeUrl(s.youtube_url) && (
                <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-11 h-11 rounded-full border border-lapis-300/40 flex items-center justify-center text-lg hover:bg-white/10 hover:text-white">
                  <i className="fa-brands fa-youtube" />
                </a>
              )}
            </div>
          )}
        </div>

        <p className="mt-12 pt-6 border-t border-white/10 text-sm text-lapis-200">
          © {new Date().getFullYear()} {t(s.footer_name)}. {t(s.footer_text)}
        </p>
      </div>
    </footer>
  );
}
