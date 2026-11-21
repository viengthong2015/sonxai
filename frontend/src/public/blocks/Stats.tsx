import { accentTextClass } from '../../lib/colors';
import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';

/** A quiet row of facts, like the summary line of a school report. */
export function Stats({ data }: { data: BlockData }) {
  const { t } = useLang();
  const items: BlockData[] = data.items ?? [];
  const cols = items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  return (
    <section className={`bg-white ${data.overlap ? 'pt-2 pb-14 lg:pb-20' : 'py-14 lg:py-20'}`}>
      <dl className={`max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-2 ${cols} gap-y-10`}>
        {items.map((it, i) => (
          <div key={i} className={`flex flex-col gap-2 pr-4 sm:px-6 lg:px-8 ${i % 2 === 1 ? 'border-l border-rule pl-5' : ''} ${i > 0 ? 'lg:border-l lg:border-rule' : 'lg:pl-0'}`}>
            <dt className="order-last text-[15px] text-ink-muted leading-snug flex items-start gap-2">
              {it.icon && <i className={`${it.icon} ${accentTextClass(it.color)}`} aria-hidden="true" />}
              {t(it.label)}
            </dt>
            <dd>
              <span className="font-display font-bold text-4xl sm:text-5xl text-lapis-800 leading-none tabular-nums">
                {it.value}
                {it.suffix}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
