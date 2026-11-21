import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { isSafeUrl } from '../../lib/url';
import { SmartLink } from '../SmartLink';
import { SectionHeading } from './SectionHeading';

export function Partners({ data }: { data: BlockData }) {
  const { t } = useLang();
  const items: BlockData[] = data.items ?? [];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle} />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8">
          {items.map((it, i) => {
            const body = (
              <>
                <div className="w-16 h-16 mb-5 flex items-center justify-center">
                  {isSafeUrl(it.logo_url) && it.logo_url ? (
                    <img src={it.logo_url} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <i className={`${it.icon || 'fa-solid fa-handshake'} text-4xl text-lapis-700`} aria-hidden="true" />
                  )}
                </div>
                <h3 className="text-lg text-ink">{t(it.name)}</h3>
                {t(it.description) && <p className="mt-1.5 text-ink-soft leading-relaxed">{t(it.description)}</p>}
              </>
            );
            return (
              <li key={i} className="border-t-2 border-rule">
                {it.url ? (
                  <SmartLink href={it.url} className="block h-full py-7 group">
                    {body}
                    <span className="mt-3 inline-block font-bold text-lapis-700 underline decoration-2 underline-offset-4 group-hover:decoration-[3px]">
                      {it.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </span>
                  </SmartLink>
                ) : (
                  <div className="h-full py-7">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
