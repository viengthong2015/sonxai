import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { ActionButton } from '../SmartLink';

export function Cta({ data }: { data: BlockData }) {
  const { t } = useLang();
  const label = t(data.button_label);

  return (
    <section className={data.style === 'brand' ? 'board' : 'bg-ink'}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 lg:py-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="max-w-2xl">
          <h2 className="text-white text-2xl sm:text-[2rem] leading-tight">{t(data.title)}</h2>
          {t(data.subtitle) && <p className="mt-3 text-lapis-100 text-lg">{t(data.subtitle)}</p>}
        </div>
        {label && (
          <ActionButton action={data.button_action} url={data.button_url} className="btn-apply text-lg shrink-0">
            {label}
          </ActionButton>
        )}
      </div>
    </section>
  );
}
