import type { BlockData, BlockType } from '../lib/types';
import type { FieldDef, FieldGroup } from './fields';

const L = (en = '', lo = '') => ({ en, lo });

const ACTION_OPTIONS = [
  { value: 'apply', label: 'Open the application form' },
  { value: 'link', label: 'Go to a link' },
  { value: 'none', label: 'No button' },
];

const LINK_HELP = 'A site page like /about, an anchor like #contact, or a full https:// address.';

export interface BlockSchema {
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  fields: FieldDef[];
  defaults: () => BlockData;
  summaryKey: string;
}

export const BLOCK_SCHEMAS: BlockSchema[] = [
  {
    type: 'hero',
    name: 'Hero banner',
    description: 'Large blue banner with headline, buttons, badges and alphabet flashcards.',
    icon: 'fa-solid fa-panorama',
    summaryKey: 'headline',
    fields: [
      { key: 'eyebrow', label: 'Small label above headline', type: 'text', localized: true },
      { key: 'headline', label: 'Headline', type: 'text', localized: true },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', localized: true },
      { key: 'primary_label', label: 'Main button text', type: 'text', localized: true, half: true },
      { key: 'primary_action', label: 'Main button action', type: 'select', options: ACTION_OPTIONS.slice(0, 2), half: true },
      { key: 'primary_url', label: 'Main button link', type: 'url', help: LINK_HELP, showIf: (d) => d.primary_action === 'link' },
      { key: 'secondary_label', label: 'Second button text', type: 'text', localized: true, half: true, help: 'Leave empty to hide.' },
      { key: 'secondary_url', label: 'Second button link', type: 'url', half: true },
      {
        key: 'badges', label: 'Trust badges', type: 'list', itemLabel: 'Badge', summaryKey: 'text', max: 6,
        newItem: () => ({ icon: 'fa-solid fa-star', color: 'amber', text: L('New badge') }),
        fields: [
          { key: 'text', label: 'Text', type: 'text', localized: true },
          { key: 'icon', label: 'Icon', type: 'icon', half: true },
          { key: 'color', label: 'Icon colour', type: 'color', half: true },
        ],
      },
      { key: 'show_graphic', label: 'Flashcards', type: 'bool', placeholder: 'Show the flashcards on the right' },
      {
        key: 'bubbles', label: 'Flashcards (up to 4)', type: 'list', itemLabel: 'Flashcard', summaryKey: 'caption', max: 4,
        showIf: (d) => !!d.show_graphic,
        newItem: () => ({ text: '', icon: 'fa-solid fa-star', caption: L('New') }),
        fields: [
          { key: 'text', label: 'Big letters (e.g. ກ ຂ ຄ)', type: 'text', half: true, help: 'Leave empty to show the icon instead.' },
          { key: 'icon', label: 'Icon', type: 'icon', half: true },
          { key: 'caption', label: 'Caption', type: 'text', localized: true },
        ],
      },
    ],
    defaults: () => ({
      eyebrow: L('Sonxai Primary School'), headline: L('Your headline here'), subtitle: L(''),
      primary_label: L('Apply now', 'ສະໝັກຮຽນດ່ວນ'), primary_action: 'apply', primary_url: '',
      secondary_label: L(''), secondary_url: '', badges: [], show_graphic: false, bubbles: [],
    }),
  },
  {
    type: 'page_header',
    name: 'Page header',
    description: 'Compact blue title banner for the top of inner pages.',
    icon: 'fa-solid fa-heading',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text', localized: true },
      { key: 'title', label: 'Title', type: 'text', localized: true },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', localized: true },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Page title'), subtitle: L('') }),
  },
  {
    type: 'stats',
    name: 'Statistics',
    description: 'A row of key numbers (students, teachers, …).',
    icon: 'fa-solid fa-chart-simple',
    summaryKey: '',
    fields: [
      { key: 'overlap', label: 'Directly under a banner', type: 'bool', placeholder: 'Remove the top spacing (use right after a hero banner)' },
      {
        key: 'items', label: 'Numbers', type: 'list', itemLabel: 'Number', summaryKey: 'label', max: 4,
        newItem: () => ({ icon: 'fa-solid fa-star', color: 'brand', value: '10', suffix: '+', label: L('New stat') }),
        fields: [
          { key: 'value', label: 'Value', type: 'text', half: true, help: 'A number, or text such as 20:1.' },
          { key: 'suffix', label: 'Suffix', type: 'text', half: true, placeholder: '+' },
          { key: 'label', label: 'Label', type: 'text', localized: true },
          { key: 'icon', label: 'Icon', type: 'icon', half: true },
          { key: 'color', label: 'Colour', type: 'color', half: true },
        ],
      },
    ],
    defaults: () => ({ overlap: false, items: [{ icon: 'fa-solid fa-face-smile', color: 'brand', value: '100', suffix: '+', label: L('Students', 'ນັກຮຽນ') }] }),
  },
  {
    type: 'cards',
    name: 'Feature cards',
    description: 'Section title with a grid of icon cards (programs, services, …).',
    icon: 'fa-solid fa-table-cells-large',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text', localized: true },
      { key: 'title', label: 'Section title', type: 'text', localized: true },
      { key: 'subtitle', label: 'Section subtitle', type: 'textarea', localized: true },
      { key: 'columns', label: 'Cards per row', type: 'select', half: true, options: [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }] },
      { key: 'background', label: 'Background', type: 'select', half: true, options: [{ value: 'slate', label: 'Light grey' }, { value: 'white', label: 'White' }] },
      {
        key: 'items', label: 'Cards', type: 'list', itemLabel: 'Card', summaryKey: 'title', max: 24,
        newItem: () => ({ icon: 'fa-solid fa-star', color: 'brand', title: L('New card'), text: L(''), link_label: L(''), link_action: 'none', link_url: '' }),
        fields: [
          { key: 'title', label: 'Title', type: 'text', localized: true },
          { key: 'text', label: 'Text', type: 'textarea', localized: true },
          { key: 'icon', label: 'Icon', type: 'icon', half: true },
          { key: 'color', label: 'Colour', type: 'color', half: true },
          { key: 'link_action', label: 'Card link', type: 'select', options: ACTION_OPTIONS, half: true },
          { key: 'link_label', label: 'Link text', type: 'text', localized: true, half: true, placeholder: 'Learn More', showIf: (d) => d.link_action !== 'none' },
          { key: 'link_url', label: 'Link URL', type: 'url', help: LINK_HELP, showIf: (d) => d.link_action === 'link' },
        ],
      },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Section title'), subtitle: L(''), columns: '3', background: 'slate', items: [] }),
  },
  {
    type: 'cta',
    name: 'Call to action',
    description: 'Full-width banner with a short message and a button.',
    icon: 'fa-solid fa-bullhorn',
    summaryKey: 'title',
    fields: [
      { key: 'title', label: 'Title', type: 'text', localized: true },
      { key: 'subtitle', label: 'Text', type: 'textarea', localized: true },
      { key: 'button_label', label: 'Button text', type: 'text', localized: true, half: true },
      { key: 'button_action', label: 'Button action', type: 'select', options: ACTION_OPTIONS.slice(0, 2), half: true },
      { key: 'button_url', label: 'Button link', type: 'url', help: LINK_HELP, showIf: (d) => d.button_action === 'link' },
      { key: 'style', label: 'Style', type: 'select', options: [{ value: 'dark', label: 'Dark' }, { value: 'brand', label: 'Blue' }] },
    ],
    defaults: () => ({ title: L('Ready to join us?'), subtitle: L(''), button_label: L('Apply now', 'ສະໝັກຮຽນດ່ວນ'), button_action: 'apply', button_url: '', style: 'dark' }),
  },
  {
    type: 'rich_text',
    name: 'Text section',
    description: 'Formatted text with headings, lists and links.',
    icon: 'fa-solid fa-align-left',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text', localized: true },
      { key: 'title', label: 'Title', type: 'text', localized: true },
      { key: 'html', label: 'Content', type: 'richtext', localized: true },
      { key: 'width', label: 'Width', type: 'select', half: true, options: [{ value: 'narrow', label: 'Narrow (easy reading)' }, { value: 'wide', label: 'Wide' }] },
      { key: 'background', label: 'Background', type: 'select', half: true, options: [{ value: 'white', label: 'White' }, { value: 'slate', label: 'Light grey' }] },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Title'), html: L(''), width: 'narrow', background: 'white' }),
  },
  {
    type: 'image_text',
    name: 'Image + text',
    description: 'Two columns: a picture next to formatted text.',
    icon: 'fa-solid fa-image',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text', localized: true },
      { key: 'title', label: 'Title', type: 'text', localized: true },
      { key: 'html', label: 'Content', type: 'richtext', localized: true },
      { key: 'image_url', label: 'Image', type: 'image' },
      { key: 'image_alt', label: 'Image description (for screen readers)', type: 'text', localized: true },
      { key: 'image_icon', label: 'Icon when there is no image', type: 'icon', half: true },
      { key: 'image_position', label: 'Image position', type: 'select', half: true, options: [{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }] },
      { key: 'button_action', label: 'Button', type: 'select', options: ACTION_OPTIONS, half: true },
      { key: 'button_label', label: 'Button text', type: 'text', localized: true, half: true, showIf: (d) => d.button_action !== 'none' },
      { key: 'button_url', label: 'Button link', type: 'url', help: LINK_HELP, showIf: (d) => d.button_action === 'link' },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Title'), html: L(''), image_url: '', image_alt: L(''), image_icon: 'fa-solid fa-school', image_position: 'right', button_action: 'none', button_label: L(''), button_url: '' }),
  },
  {
    type: 'partners',
    name: 'Partners / logos',
    description: 'Grid of partner organisations with logo or icon.',
    icon: 'fa-solid fa-handshake',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text', localized: true },
      { key: 'title', label: 'Title', type: 'text', localized: true },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', localized: true },
      {
        key: 'items', label: 'Partners', type: 'list', itemLabel: 'Partner', summaryKey: 'name', max: 40,
        newItem: () => ({ name: L('Partner name'), description: L(''), icon: 'fa-solid fa-handshake', logo_url: '', url: '' }),
        fields: [
          { key: 'name', label: 'Name', type: 'text', localized: true },
          { key: 'description', label: 'Short description', type: 'textarea', localized: true },
          { key: 'logo_url', label: 'Logo', type: 'image' },
          { key: 'icon', label: 'Icon when there is no logo', type: 'icon', half: true },
          { key: 'url', label: 'Website', type: 'url', half: true, placeholder: 'https://' },
        ],
      },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Our partners', 'ຄູ່ຮ່ວມງານຂອງພວກເຮົາ'), subtitle: L(''), items: [] }),
  },
  {
    type: 'enrollment_form',
    name: 'Application form',
    description: 'Inline admission request form. Submissions appear under Applications.',
    icon: 'fa-solid fa-file-signature',
    summaryKey: 'title',
    fields: [
      { key: 'title', label: 'Title', type: 'text', localized: true },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', localized: true },
    ],
    defaults: () => ({ title: L('Request an enrollment pack', 'ຂໍຮັບເອກະສານການລົງທະບຽນ'), subtitle: L('') }),
  },
];

export const SCHEMA_BY_TYPE = Object.fromEntries(BLOCK_SCHEMAS.map((s) => [s.type, s])) as Record<BlockType, BlockSchema>;

/* ---------------------------------------------------------------- site settings form */
export const SETTINGS_GROUPS: FieldGroup[] = [
  {
    title: 'Branding',
    description: 'Shown in the top-left logo of every page.',
    fields: [
      { key: 'site_name', label: 'School name', type: 'text', localized: true, half: true },
      { key: 'site_tagline', label: 'Tagline under the name', type: 'text', localized: true, half: true },
      { key: 'logo_icon', label: 'Logo icon', type: 'icon', half: true },
      { key: 'logo_image_url', label: 'Logo image (replaces the icon)', type: 'image' },
      { key: 'meta_description', label: 'Search engine description', type: 'textarea', localized: true },
    ],
  },
  {
    title: 'Header',
    fields: [
      { key: 'show_dashboard_button', label: 'Dashboard button', type: 'bool', placeholder: 'Show the "Dashboard" button (links to this admin panel)' },
      { key: 'dashboard_label', label: 'Dashboard button text', type: 'text', localized: true, showIf: (d) => !!d.show_dashboard_button },
    ],
  },
  {
    title: 'Footer & contact',
    fields: [
      { key: 'footer_name', label: 'Footer name', type: 'text', localized: true, half: true },
      { key: 'footer_text', label: 'Footer text', type: 'text', localized: true, half: true },
      { key: 'contact_phone', label: 'Phone', type: 'text', half: true, placeholder: '+856 20 …' },
      { key: 'contact_email', label: 'Email', type: 'text', half: true, placeholder: 'info@…' },
      { key: 'contact_address', label: 'Address', type: 'text', localized: true },
      { key: 'facebook_url', label: 'Facebook page', type: 'url', half: true, placeholder: 'https://facebook.com/…' },
      { key: 'youtube_url', label: 'YouTube channel', type: 'url', half: true, placeholder: 'https://youtube.com/…' },
    ],
  },
  {
    title: 'Application form',
    description: 'Used by the "Apply now" pop-up and the Application form block.',
    fields: [
      { key: 'apply_title', label: 'Pop-up title', type: 'text', localized: true },
      { key: 'apply_subtitle', label: 'Pop-up subtitle', type: 'text', localized: true },
      {
        key: 'grades', label: 'Grade options', type: 'list', itemLabel: 'Grade', summaryKey: 'label', max: 20,
        newItem: () => ({ label: L('New grade') }),
        fields: [{ key: 'label', label: 'Grade name', type: 'text', localized: true }],
      },
    ],
  },
];
