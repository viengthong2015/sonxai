import type { ComponentType } from 'react';
import type { BlockData, BlockType, PageBlock } from '../../lib/types';
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

export function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <>
      {blocks.map((b) => {
        const C = COMPONENTS[b.block_type];
        return C ? <C key={b.id} data={b.data ?? {}} /> : null;
      })}
    </>
  );
}
