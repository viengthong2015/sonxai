import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { isSafeUrl } from '../../lib/url';
import { ActionButton } from '../SmartLink';
import { Html } from './RichText';

export function ImageText({ data }: { data: BlockData }) {
  const { t } = useLang();
  const imageLeft = data.image_position === 'left';
  const label = t(data.button_label);
  const html = t(data.html);

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className={imageLeft ? 'lg:order-2' : ''}>
          {t(data.eyebrow) && <p className="font-bold text-hibiscus-600 mb-2">{t(data.eyebrow)}</p>}
          {t(data.title) && <h2 className="text-3xl sm:text-[2.5rem] leading-[1.2] text-ink mb-6">{t(data.title)}</h2>}
          {html && <Html html={html} className="prose-lg max-w-[38rem]" />}
          {label && data.button_action !== 'none' && (
            <ActionButton action={data.button_action} url={data.button_url} className="btn-apply mt-8">
              {label}
            </ActionButton>
          )}
        </div>
        <div className={imageLeft ? 'lg:order-1' : ''}>
          {isSafeUrl(data.image_url) && data.image_url ? (
            <img src={data.image_url} alt={t(data.image_alt)} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-xl" />
          ) : (
            // No photo yet: an exercise-book page with the chosen icon.
            <div className="w-full aspect-[4/3] rounded-xl ruled-paper border border-rule flex items-center justify-center" aria-hidden="true">
              <i className={`${data.image_icon || 'fa-solid fa-school'} text-lapis-700 text-7xl`} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
