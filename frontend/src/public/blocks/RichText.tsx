import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { SectionHeading } from './SectionHeading';

export const PROSE =
  'prose max-w-none prose-p:text-ink-soft prose-li:text-ink-soft prose-headings:font-display prose-headings:text-ink prose-strong:text-ink ' +
  'prose-a:text-lapis-700 prose-a:font-bold prose-a:decoration-2 prose-a:underline-offset-4 prose-li:marker:text-hibiscus-600 prose-li:marker:font-bold ' +
  'prose-blockquote:border-l-marigold-500 prose-blockquote:text-ink prose-hr:border-rule';

/** HTML is sanitised server-side (nh3 allow-list) before it is stored. */
export function Html({ html, className = '' }: { html: string; className?: string }) {
  return <div className={`${PROSE} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function RichText({ data }: { data: BlockData }) {
  const { t } = useLang();
  const html = t(data.html);
  return (
    <section className={`py-16 lg:py-24 ${data.background === 'slate' ? 'bg-mist' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={data.width === 'wide' ? '' : 'max-w-[42rem]'}>
          <SectionHeading eyebrow={data.eyebrow} title={data.title} />
          {html && <Html html={html} className="prose-lg -mt-4" />}
        </div>
      </div>
    </section>
  );
}
