import type { CSSProperties } from 'react';
import { onBoardClass } from '../../lib/colors';
import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { ActionButton } from '../SmartLink';
import { BookEdge } from './BookEdge';

/**
 * Exercise-book flashcards pinned on the board. Position, tilt and glyph colour per slot;
 * the glyph colours are the logo's: lapis, magenta, green, orange.
 */
const CARDS = [
  { offset: '', r: '-5deg', glyph: 'text-lapis-700' },
  { offset: 'mt-8 sm:mt-10', r: '4deg', glyph: 'text-hibiscus-600' },
  { offset: '', r: '3deg', glyph: 'text-leaf-600' },
  { offset: 'mt-8 sm:mt-10', r: '-4deg', glyph: 'text-marigold-600' },
];

function Flashcard({ card, index }: { card: BlockData; index: number }) {
  const { t } = useLang();
  const slot = CARDS[index];
  const style = { '--r': slot.r, transform: `rotate(${slot.r})`, animationDelay: `${150 + index * 110}ms` } as CSSProperties;
  return (
    <figure
      className={`${slot.offset} aspect-[5/6] rounded-[6px] ruled-paper paper-shadow animate-deal motion-reduce:animate-none
        flex flex-col items-center justify-center pl-6 pr-3`}
      style={style}
    >
      {card.text ? (
        <span className={`font-display font-bold leading-none whitespace-nowrap text-[clamp(1.6rem,7vw,2.9rem)] lg:text-[clamp(1.6rem,3vw,2.9rem)] tracking-wide ${slot.glyph}`}>{card.text}</span>
      ) : (
        card.icon && <i className={`${card.icon} text-[clamp(2rem,8vw,3.25rem)] lg:text-[clamp(2rem,3.4vw,3.25rem)] ${slot.glyph}`} />
      )}
      {t(card.caption) && <figcaption className="mt-3 text-sm sm:text-[15px] font-bold text-ink-soft">{t(card.caption)}</figcaption>}
    </figure>
  );
}

export function Hero({ data }: { data: BlockData }) {
  const { t } = useLang();
  const badges: BlockData[] = data.badges ?? [];
  const cards: BlockData[] = (data.bubbles ?? []).slice(0, CARDS.length);
  const primary = t(data.primary_label);
  const secondary = t(data.secondary_label);
  const withCards = data.show_graphic && cards.length > 0;

  return (
    <section className="board text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 lg:pt-24 pb-6">
        <div className={`grid grid-cols-1 items-center gap-10 lg:gap-6 ${withCards ? 'lg:grid-cols-12' : ''}`}>
          <div className={withCards ? 'lg:col-span-7' : 'max-w-3xl'}>
            {t(data.eyebrow) && <p className="font-bold text-marigold-300 mb-4">{t(data.eyebrow)}</p>}
            <h1 className="text-white text-[2.4rem] sm:text-5xl lg:text-[4.1rem] leading-[1.12] max-w-[16ch]">{t(data.headline)}</h1>
            {t(data.subtitle) && <p className="mt-6 text-lg sm:text-xl text-lapis-100 max-w-[38rem] leading-relaxed">{t(data.subtitle)}</p>}

            {(primary || secondary) && (
              <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {primary && (
                  <ActionButton action={data.primary_action} url={data.primary_url} className="btn-apply text-lg">
                    {primary}
                  </ActionButton>
                )}
                {secondary && (
                  <ActionButton action="link" url={data.secondary_url} className="btn-outline-light text-lg">
                    {secondary}
                  </ActionButton>
                )}
              </div>
            )}

            {badges.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[15px] text-lapis-100">
                {badges.map((b, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    {b.icon && <i className={`${b.icon} ${onBoardClass(b.color)}`} aria-hidden="true" />}
                    {t(b.text)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {withCards && (
            <div className="lg:col-span-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:gap-x-9 sm:gap-y-7 w-full max-w-[320px] sm:max-w-[430px] mx-auto lg:mr-0 pb-10" aria-hidden="true">
              {cards.map((c, i) => (
                <Flashcard key={i} card={c} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
      <BookEdge />
    </section>
  );
}
