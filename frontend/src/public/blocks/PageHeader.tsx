import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { BookEdge } from './BookEdge';

export function PageHeader({ data }: { data: BlockData }) {
  const { t } = useLang();
  return (
    <section className="board text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 lg:pt-20 pb-4">
        <div className="max-w-3xl">
          {t(data.eyebrow) && <p className="font-bold text-marigold-300 mb-3">{t(data.eyebrow)}</p>}
          <h1 className="text-white text-[2.25rem] sm:text-5xl leading-[1.15]">{t(data.title)}</h1>
          {t(data.subtitle) && <p className="mt-5 text-lg sm:text-xl text-lapis-100 max-w-[38rem] leading-relaxed">{t(data.subtitle)}</p>}
        </div>
      </div>
      <BookEdge className="h-10 sm:h-14 lg:h-16" />
    </section>
  );
}
