import type { BlockData, BlockType } from '../lib/types';
import type { FieldDef, FieldGroup } from './fields';
import { msg } from './i18n';

const L = (en = '', lo = '') => ({ en, lo });

const ACTION_OPTIONS = [
  { value: 'apply', label: msg('Open the application form') },
  { value: 'link', label: msg('Go to a link') },
  { value: 'none', label: msg('No button') },
];

const LINK_HELP = msg('A site page like /about, an anchor like #contact, or a full https:// address.');

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
    name: msg('Hero banner'),
    description: msg('Large blue banner with headline, buttons, badges and alphabet flashcards.'),
    icon: 'fa-solid fa-panorama',
    summaryKey: 'headline',
    fields: [
      { key: 'eyebrow', label: msg('Small label above headline'), type: 'text', localized: true },
      { key: 'headline', label: msg('Headline'), type: 'text', localized: true },
      { key: 'subtitle', label: msg('Subtitle'), type: 'textarea', localized: true },
      { key: 'primary_label', label: msg('Main button text'), type: 'text', localized: true, half: true },
      { key: 'primary_action', label: msg('Main button action'), type: 'select', options: ACTION_OPTIONS.slice(0, 2), half: true },
      { key: 'primary_url', label: msg('Main button link'), type: 'url', help: LINK_HELP, showIf: (d) => d.primary_action === 'link' },
      { key: 'secondary_label', label: msg('Second button text'), type: 'text', localized: true, half: true, help: msg('Leave empty to hide.') },
      { key: 'secondary_url', label: msg('Second button link'), type: 'url', half: true },
      {
        key: 'badges', label: msg('Trust badges'), type: 'list', itemLabel: msg('Badge'), summaryKey: 'text', max: 6,
        newItem: () => ({ icon: 'fa-solid fa-star', color: 'amber', text: L('New badge') }),
        fields: [
          { key: 'text', label: msg('Text'), type: 'text', localized: true },
          { key: 'icon', label: msg('Icon'), type: 'icon', half: true },
          { key: 'color', label: msg('Icon colour'), type: 'color', half: true },
        ],
      },
      { key: 'show_graphic', label: msg('Flashcards'), type: 'bool', placeholder: msg('Show the flashcards on the right') },
      {
        key: 'bubbles', label: msg('Flashcards (up to 4)'), type: 'list', itemLabel: msg('Flashcard'), summaryKey: 'caption', max: 4,
        showIf: (d) => !!d.show_graphic,
        newItem: () => ({ text: '', icon: 'fa-solid fa-star', caption: L('New') }),
        fields: [
          { key: 'text', label: msg('Big letters (e.g. ກ ຂ ຄ)'), type: 'text', half: true, help: msg('Leave empty to show the icon instead.') },
          { key: 'icon', label: msg('Icon'), type: 'icon', half: true },
          { key: 'caption', label: msg('Caption'), type: 'text', localized: true },
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
    name: msg('Page header'),
    description: msg('Compact blue title banner for the top of inner pages.'),
    icon: 'fa-solid fa-heading',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: msg('Small label'), type: 'text', localized: true },
      { key: 'title', label: msg('Title'), type: 'text', localized: true },
      { key: 'subtitle', label: msg('Subtitle'), type: 'textarea', localized: true },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Page title'), subtitle: L('') }),
  },
  {
    type: 'stats',
    name: msg('Statistics'),
    description: msg('A row of key numbers (students, teachers, …).'),
    icon: 'fa-solid fa-chart-simple',
    summaryKey: '',
    fields: [
      { key: 'overlap', label: msg('Directly under a banner'), type: 'bool', placeholder: msg('Remove the top spacing (use right after a hero banner)') },
      {
        key: 'items', label: msg('Numbers'), type: 'list', itemLabel: msg('Number'), summaryKey: 'label', max: 4,
        newItem: () => ({ icon: 'fa-solid fa-star', color: 'brand', value: '10', suffix: '+', label: L('New stat') }),
        fields: [
          { key: 'value', label: msg('Value'), type: 'text', half: true, help: msg('A number, or text such as 20:1.') },
          { key: 'suffix', label: msg('Suffix'), type: 'text', half: true, placeholder: msg('+') },
          { key: 'label', label: msg('Label'), type: 'text', localized: true },
          { key: 'icon', label: msg('Icon'), type: 'icon', half: true },
          { key: 'color', label: msg('Colour'), type: 'color', half: true },
        ],
      },
    ],
    defaults: () => ({ overlap: false, items: [{ icon: 'fa-solid fa-face-smile', color: 'brand', value: '100', suffix: '+', label: L('Students', 'ນັກຮຽນ') }] }),
  },
  {
    type: 'cards',
    name: msg('Feature cards'),
    description: msg('Section title with a grid of icon cards (programs, services, …).'),
    icon: 'fa-solid fa-table-cells-large',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: msg('Small label'), type: 'text', localized: true },
      { key: 'title', label: msg('Section title'), type: 'text', localized: true },
      { key: 'subtitle', label: msg('Section subtitle'), type: 'textarea', localized: true },
      { key: 'columns', label: msg('Cards per row'), type: 'select', half: true, options: [{ value: '2', label: msg('2') }, { value: '3', label: msg('3') }, { value: '4', label: msg('4') }] },
      { key: 'background', label: msg('Background'), type: 'select', half: true, options: [{ value: 'slate', label: msg('Light grey') }, { value: 'white', label: msg('White') }] },
      {
        key: 'items', label: msg('Cards'), type: 'list', itemLabel: msg('Card'), summaryKey: 'title', max: 24,
        newItem: () => ({ icon: 'fa-solid fa-star', color: 'brand', title: L('New card'), text: L(''), link_label: L(''), link_action: 'none', link_url: '' }),
        fields: [
          { key: 'title', label: msg('Title'), type: 'text', localized: true },
          { key: 'text', label: msg('Text'), type: 'textarea', localized: true },
          { key: 'icon', label: msg('Icon'), type: 'icon', half: true },
          { key: 'color', label: msg('Colour'), type: 'color', half: true },
          { key: 'link_action', label: msg('Card link'), type: 'select', options: ACTION_OPTIONS, half: true },
          { key: 'link_label', label: msg('Link text'), type: 'text', localized: true, half: true, placeholder: msg('Learn More'), showIf: (d) => d.link_action !== 'none' },
          { key: 'link_url', label: msg('Link URL'), type: 'url', help: LINK_HELP, showIf: (d) => d.link_action === 'link' },
        ],
      },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Section title'), subtitle: L(''), columns: '3', background: 'slate', items: [] }),
  },
  {
    type: 'cta',
    name: msg('Call to action'),
    description: msg('Full-width banner with a short message and a button.'),
    icon: 'fa-solid fa-bullhorn',
    summaryKey: 'title',
    fields: [
      { key: 'title', label: msg('Title'), type: 'text', localized: true },
      { key: 'subtitle', label: msg('Text'), type: 'textarea', localized: true },
      { key: 'button_label', label: msg('Button text'), type: 'text', localized: true, half: true },
      { key: 'button_action', label: msg('Button action'), type: 'select', options: ACTION_OPTIONS.slice(0, 2), half: true },
      { key: 'button_url', label: msg('Button link'), type: 'url', help: LINK_HELP, showIf: (d) => d.button_action === 'link' },
      { key: 'style', label: msg('Style'), type: 'select', options: [{ value: 'dark', label: msg('Dark') }, { value: 'brand', label: msg('Blue') }] },
    ],
    defaults: () => ({ title: L('Ready to join us?'), subtitle: L(''), button_label: L('Apply now', 'ສະໝັກຮຽນດ່ວນ'), button_action: 'apply', button_url: '', style: 'dark' }),
  },
  {
    type: 'rich_text',
    name: msg('Text section'),
    description: msg('Formatted text with headings, lists and links.'),
    icon: 'fa-solid fa-align-left',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: msg('Small label'), type: 'text', localized: true },
      { key: 'title', label: msg('Title'), type: 'text', localized: true },
      { key: 'html', label: msg('Content'), type: 'richtext', localized: true },
      { key: 'width', label: msg('Width'), type: 'select', half: true, options: [{ value: 'narrow', label: msg('Narrow (easy reading)') }, { value: 'wide', label: msg('Wide') }] },
      { key: 'background', label: msg('Background'), type: 'select', half: true, options: [{ value: 'white', label: msg('White') }, { value: 'slate', label: msg('Light grey') }] },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Title'), html: L(''), width: 'narrow', background: 'white' }),
  },
  {
    type: 'image_text',
    name: msg('Image + text'),
    description: msg('Two columns: a picture next to formatted text.'),
    icon: 'fa-solid fa-image',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: msg('Small label'), type: 'text', localized: true },
      { key: 'title', label: msg('Title'), type: 'text', localized: true },
      { key: 'html', label: msg('Content'), type: 'richtext', localized: true },
      { key: 'image_url', label: msg('Image'), type: 'image' },
      { key: 'image_alt', label: msg('Image description (for screen readers)'), type: 'text', localized: true },
      { key: 'image_icon', label: msg('Icon when there is no image'), type: 'icon', half: true },
      { key: 'image_position', label: msg('Image position'), type: 'select', half: true, options: [{ value: 'right', label: msg('Right') }, { value: 'left', label: msg('Left') }] },
      { key: 'button_action', label: msg('Button'), type: 'select', options: ACTION_OPTIONS, half: true },
      { key: 'button_label', label: msg('Button text'), type: 'text', localized: true, half: true, showIf: (d) => d.button_action !== 'none' },
      { key: 'button_url', label: msg('Button link'), type: 'url', help: LINK_HELP, showIf: (d) => d.button_action === 'link' },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Title'), html: L(''), image_url: '', image_alt: L(''), image_icon: 'fa-solid fa-school', image_position: 'right', button_action: 'none', button_label: L(''), button_url: '' }),
  },
  {
    type: 'partners',
    name: msg('Partners / logos'),
    description: msg('Grid of partner organisations with logo or icon.'),
    icon: 'fa-solid fa-handshake',
    summaryKey: 'title',
    fields: [
      { key: 'eyebrow', label: msg('Small label'), type: 'text', localized: true },
      { key: 'title', label: msg('Title'), type: 'text', localized: true },
      { key: 'subtitle', label: msg('Subtitle'), type: 'textarea', localized: true },
      {
        key: 'items', label: msg('Partners'), type: 'list', itemLabel: msg('Partner'), summaryKey: 'name', max: 40,
        newItem: () => ({ name: L('Partner name'), description: L(''), icon: 'fa-solid fa-handshake', logo_url: '', url: '' }),
        fields: [
          { key: 'name', label: msg('Name'), type: 'text', localized: true },
          { key: 'description', label: msg('Short description'), type: 'textarea', localized: true },
          { key: 'logo_url', label: msg('Logo'), type: 'image' },
          { key: 'icon', label: msg('Icon when there is no logo'), type: 'icon', half: true },
          { key: 'url', label: msg('Website'), type: 'url', half: true, placeholder: msg('https://') },
        ],
      },
    ],
    defaults: () => ({ eyebrow: L(''), title: L('Our partners', 'ຄູ່ຮ່ວມງານຂອງພວກເຮົາ'), subtitle: L(''), items: [] }),
  },
  {
    type: 'enrollment_form',
    name: msg('Application form'),
    description: msg('Inline admission request form. Submissions appear under Applications.'),
    icon: 'fa-solid fa-file-signature',
    summaryKey: 'title',
    fields: [
      { key: 'title', label: msg('Title'), type: 'text', localized: true },
      { key: 'subtitle', label: msg('Subtitle'), type: 'textarea', localized: true },
    ],
    defaults: () => ({ title: L('Request an enrollment pack', 'ຂໍຮັບເອກະສານການລົງທະບຽນ'), subtitle: L('') }),
  },
];

export const SCHEMA_BY_TYPE = Object.fromEntries(BLOCK_SCHEMAS.map((s) => [s.type, s])) as Record<BlockType, BlockSchema>;

/* ---------------------------------------------------------------- site settings form */
export const SETTINGS_GROUPS: FieldGroup[] = [
  {
    title: msg('Branding'),
    description: msg('Shown in the top-left logo of every page.'),
    fields: [
      { key: 'site_name', label: msg('School name'), type: 'text', localized: true, half: true },
      { key: 'site_tagline', label: msg('Tagline under the name'), type: 'text', localized: true, half: true },
      { key: 'logo_icon', label: msg('Logo icon'), type: 'icon', half: true },
      { key: 'logo_image_url', label: msg('Logo image (replaces the icon)'), type: 'image' },
      { key: 'meta_description', label: msg('Search engine description'), type: 'textarea', localized: true },
    ],
  },
  {
    title: msg('Header'),
    fields: [
      { key: 'show_dashboard_button', label: msg('Dashboard button'), type: 'bool', placeholder: msg('Show the "Dashboard" button (links to this admin panel)') },
      { key: 'dashboard_label', label: msg('Dashboard button text'), type: 'text', localized: true, showIf: (d) => !!d.show_dashboard_button },
    ],
  },
  {
    title: msg('Footer & contact'),
    fields: [
      { key: 'footer_name', label: msg('Footer name'), type: 'text', localized: true, half: true },
      { key: 'footer_text', label: msg('Footer text'), type: 'text', localized: true, half: true },
      { key: 'contact_phone', label: msg('Phone'), type: 'text', half: true, placeholder: msg('+856 20 …') },
      { key: 'contact_email', label: msg('Email'), type: 'text', half: true, placeholder: msg('info@…') },
      { key: 'contact_address', label: msg('Address'), type: 'text', localized: true },
      { key: 'facebook_url', label: msg('Facebook page'), type: 'url', half: true, placeholder: msg('https://facebook.com/…') },
      { key: 'youtube_url', label: msg('YouTube channel'), type: 'url', half: true, placeholder: msg('https://youtube.com/…') },
    ],
  },
  {
    title: msg('Application form'),
    description: msg('Used by the "Apply now" pop-up and the Application form block.'),
    fields: [
      { key: 'apply_title', label: msg('Pop-up title'), type: 'text', localized: true },
      { key: 'apply_subtitle', label: msg('Pop-up subtitle'), type: 'text', localized: true },
      {
        key: 'grades', label: msg('Grade options'), type: 'list', itemLabel: msg('Grade'), summaryKey: 'label', max: 20,
        newItem: () => ({ label: L('New grade') }),
        fields: [{ key: 'label', label: msg('Grade name'), type: 'text', localized: true }],
      },
    ],
  },
];
