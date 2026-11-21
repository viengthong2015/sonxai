import { useLang } from '../../lib/i18n';
import type { Localized } from '../../lib/types';

/** Left-aligned section heading. The eyebrow is a short sentence-case lead-in, not a label. */
export function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: Localized; title?: Localized; subtitle?: Localized }) {
  const { t } = useLang();
  if (!t(eyebrow) && !t(title) && !t(subtitle)) return null;
  return (
    <header className="max-w-2xl mb-12">
      {t(eyebrow) && <p className="font-bold text-hibiscus-600 mb-2">{t(eyebrow)}</p>}
      {t(title) && <h2 className="text-3xl sm:text-[2.5rem] leading-[1.2] text-ink">{t(title)}</h2>}
      {t(subtitle) && <p className="mt-4 text-lg text-ink-soft leading-relaxed">{t(subtitle)}</p>}
    </header>
  );
}
