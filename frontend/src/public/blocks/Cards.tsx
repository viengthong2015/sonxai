import { accentTextClass, spineClass } from '../../lib/colors';
import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { ActionButton } from '../SmartLink';
import { SectionHeading } from './SectionHeading';

const COLS: Record<string, string> = {
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-2 lg:grid-cols-3',
  '4': 'md:grid-cols-2 lg:grid-cols-4',
};

/** Each programme is an exercise book: white pages with a coloured spine. */
export function Cards({ data }: { data: BlockData }) {
  const { t, ui } = useLang();
  const items: BlockData[] = data.items ?? [];

  return (
    <section className={`py-16 lg:py-24 ${data.background === 'white' ? 'bg-white' : 'bg-mist'}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle} />
        <ul className={`grid grid-cols-1 gap-6 ${COLS[data.columns] ?? COLS['3']}`}>
          {items.map((it, i) => (
            <li key={i} className="relative flex flex-col bg-white border border-rule rounded-r-2xl rounded-l-[4px] pl-9 pr-7 pt-8 pb-7">
              <span className={`absolute left-0 inset-y-0 w-2.5 rounded-l-[4px] ${spineClass(it.color)}`} aria-hidden="true" />
              <i className={`${it.icon || 'fa-solid fa-book'} text-[1.75rem] mb-5 ${accentTextClass(it.color)}`} aria-hidden="true" />
              <h3 className="text-xl text-ink mb-2">{t(it.title)}</h3>
              <p className="text-ink-soft leading-relaxed flex-1">{t(it.text)}</p>
              {it.link_action && it.link_action !== 'none' && (
                <ActionButton
                  action={it.link_action}
                  url={it.link_url}
                  className={`mt-6 self-start font-bold underline decoration-2 underline-offset-[6px] hover:decoration-[3px] ${accentTextClass(it.color)}`}
                >
                  {t(it.link_label) || ui('learn_more')}
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
