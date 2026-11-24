import type { ComponentType } from 'react';
import type { BlockData, BlockType, PageBlock } from '../../lib/types';
import { GuideBlock } from '../SectionGuide';
import { Cards } from './Cards';
import { Cta } from './Cta';
import { EnrollmentForm } from './EnrollmentForm';
import { Hero } from './Hero';
import { ImageText } from './ImageText';
import { PageHeader } from './PageHeader';
import { Partners } from './Partners';
import { RichText } from './RichText';
import { Stats } from './Stats';

const COMPONENTS: Record<BlockType, ComponentType<{ data: BlockData }>> = {
  hero: Hero,
  page_header: PageHeader,
  stats: Stats,
  cards: Cards,
  cta: Cta,
  rich_text: RichText,
  image_text: ImageText,
  partners: Partners,
  enrollment_form: EnrollmentForm,
};

/** In preview guide mode: label each block and link it to the page editor. */
export interface BlockGuideInfo {
  menuId?: number;
  pageLabel: string;
}

export function BlockRenderer({ blocks, guide }: { blocks: PageBlock[]; guide?: BlockGuideInfo }) {
  return (
    <>
      {blocks.map((b, i) => {
        const C = COMPONENTS[b.block_type];
        if (!C) return null;
        if (!guide) return <C key={b.id} data={b.data ?? {}} />;
        return (
          <GuideBlock key={b.id} block={b} index={i + 1} menuId={guide.menuId} pageLabel={guide.pageLabel}>
            <C data={b.data ?? {}} />
          </GuideBlock>
        );
      })}
    </>
  );
}
