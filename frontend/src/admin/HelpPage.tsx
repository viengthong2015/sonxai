/**
 * User manual: step-by-step help for staff, shown inside the admin panel.
 *
 * Every text is marked with msg() so it appears under Languages → Labels and messages →
 * Admin panel text and can be translated like the rest of the admin panel.
 * Inside a text, **Name** marks a button or screen name and is shown highlighted; __text__ is
 * plain bold emphasis. `npm run check:manual` (part of the build) checks every **Name** against
 * the real admin labels and that every sidebar screen has a section here.
 * The block and settings references are built from blockSchemas.ts, so they stay in sync.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOCK_SCHEMAS, SETTINGS_GROUPS } from './blockSchemas';
import { PageMap } from './PageMap';
import { PageTitle } from './components/ui';
import { msg, useAT, type AT } from './i18n';

interface Section {
  id: string;
  icon: string;
  title: string;
  intro: string;
  /** Screen this section is about, with the button label. */
  open?: { to: string; label: string };
  /** Groups of numbered steps, each with an optional heading. */
  steps: { heading?: string; items: string[] }[];
  tips?: string[];
  /** Extra reference content rendered after the steps. */
  extra?: 'blocks' | 'settings';
}

const SECTIONS: Section[] = [
  {
    id: 'basics',
    icon: 'fa-solid fa-route',
    title: msg('How the website editor works'),
    intro: msg('Every change you make is saved as a draft first. Visitors only see it after you publish, so you can work safely and check everything before it goes live.'),
    open: { to: '/admin', label: msg('Dashboard') },
    steps: [
      {
        items: [
          msg('**Edit**: change menus, pages or settings. Each save is kept in the draft.'),
          msg('**Preview draft**: open the draft website (left sidebar, bottom) and check your changes on a computer and a phone.'),
          msg('**Publish**: click **Publish** in the top bar. The live website now shows your changes.'),
          msg('__Undo if needed__: every publish is kept under **Publish & history** and can be restored.'),
        ],
      },
    ],
    tips: [
      msg('The **Publish** button in the top bar shows when there are unpublished changes.'),
      msg('Choose the language of this admin panel with the language picker in the top bar.'),
      msg('Click **Show section labels** in the preview bar to see which block or setting controls each part of the page.'),
    ],
  },
  {
    id: 'menu',
    icon: 'fa-solid fa-bars-staggered',
    title: msg('Menu bar (top navigation)'),
    intro: msg('The menu bar at the top of the website lists your pages and links. Each item is either a page built from content blocks, or a link to another address.'),
    open: { to: '/admin/menus', label: msg('Menus & Pages') },
    steps: [
      {
        heading: msg('Add a new page to the menu'),
        items: [
          msg('Open **Menus & Pages** and click **New menu item**.'),
          msg('Choose the type **Page with content**.'),
          msg('Type the **Label** in English and in each other language. This is the text shown in the menu bar.'),
          msg('Check the **Page address** (for example news). It is filled in from the English label; use lowercase letters, numbers and dashes only.'),
          msg('Leave **Published on site** and **Show in top menu** switched on.'),
          msg('Click **Create & add content**. The page editor opens so you can add blocks (see Page content).'),
        ],
      },
      {
        heading: msg('Add a link (Facebook, another website or a section)'),
        items: [
          msg('Click **New menu item** and choose the type **Link**.'),
          msg('Type the **Label** and the **Link URL**, for example https://facebook.com/yourschool or /enrollment.'),
          msg('Switch on **Open in new tab** for addresses outside the school website.'),
          msg('Click **Create link**.'),
        ],
      },
      {
        heading: msg('Change the order of the menu'),
        items: [
          msg('In **Menus & Pages**, use **Move up** and **Move down** (arrow buttons) on an item.'),
          msg('The **Top menu preview (draft)** above the list shows the new order.'),
        ],
      },
      {
        heading: msg('Rename, hide or change an item'),
        items: [
          msg('Click the **Menu settings** button (gear icon) on the item.'),
          msg('Change the label, address or switches, then save.'),
          msg('Switch off **Show in top menu** to keep the page online but remove it from the menu bar. The list shows it as **Not in menu**.'),
          msg('Switch off **Published on site** to take the page offline completely. The list shows it as **Hidden**.'),
        ],
      },
      {
        heading: msg('Choose the home page'),
        items: [
          msg('Open **Menu settings** on the page that visitors should see first.'),
          msg('Switch on **Use as home page** and save. The list marks it with **Home**.'),
        ],
      },
      {
        heading: msg('Delete an item'),
        items: [
          msg('Click **Delete** (bin icon) on the item and confirm.'),
          msg('The item disappears from the website after you publish. If you made a mistake, restore an older version from **Publish & history**.'),
        ],
      },
    ],
    tips: [
      msg('Changing a page address changes its web link. Links shared earlier (Facebook posts, printed flyers) will stop working.'),
      msg('Prefer hiding over deleting when a page may be needed again, for example a seasonal announcement.'),
      msg('Open **Search engine description (optional)** in Menu settings to write the short text Google shows for the page.'),
    ],
  },
  {
    id: 'content',
    icon: 'fa-solid fa-pen-to-square',
    title: msg('Page content (blocks)'),
    intro: msg('A page is built from blocks stacked from top to bottom: banners, text, cards, statistics, forms and more. You add, edit and arrange blocks in the page editor.'),
    open: { to: '/admin/menus', label: msg('Menus & Pages') },
    steps: [
      {
        heading: msg('Open a page'),
        items: [
          msg('Open **Menus & Pages** and click **Edit content** on the page.'),
          msg('Use the language switch at the top of the editor to choose which language you are editing.'),
        ],
      },
      {
        heading: msg('Add a block'),
        items: [
          msg('Click **Add block** at the bottom of the page, or **Insert block here** between two blocks.'),
          msg('Pick the block type from the list (see the block guide below).'),
          msg('Fill in the fields and click **Save block**.'),
        ],
      },
      {
        heading: msg('Edit, move or remove a block'),
        items: [
          msg('Click **Edit** on a block to open its fields, change the text, then click **Save block**.'),
          msg('Use **Move up** and **Move down** to change where the block appears on the page.'),
          msg('**Duplicate** makes a copy of the block, useful for similar sections.'),
          msg('Switch off **Visible** to keep the block but not show it on the website. It is then marked **Hidden**.'),
          msg('**Delete** removes the block from the draft.'),
        ],
      },
      {
        heading: msg('Lists inside a block (cards, numbers, partners…)'),
        items: [
          msg('Some blocks contain a list of items. Use the add button under the list to add one, and **Move up**, **Move down** or **Remove** on an item to move or remove it.'),
          msg('Each list has a maximum number of items; the add button disappears when it is full.'),
        ],
      },
      {
        heading: msg('Check and publish'),
        items: [
          msg('Click **Preview** to see the page as visitors will.'),
          msg('When everything is correct, click **Publish** in the top bar.'),
        ],
      },
    ],
    tips: [
      msg('Save each block before opening another. The editor warns you about unsaved changes.'),
      msg('Links in buttons can be a site page like /about, a section anchor like #contact, or a full https:// address.'),
    ],
    extra: 'blocks',
  },
  {
    id: 'images',
    icon: 'fa-solid fa-image',
    title: msg('Images and icons'),
    intro: msg('Image fields have an Upload button and a Library of images that were uploaded before.'),
    steps: [
      {
        items: [
          msg('In an image field, click **Upload** and choose a PNG, JPEG, GIF or WebP file of up to 5 MB.'),
          msg('To reuse an image, click **Library** and pick it instead of uploading it again.'),
          msg('In an icon field, click **Choose icon** and pick an icon.'),
          msg('In a colour field, pick the colour for the icon or number from the list.'),
        ],
      },
    ],
    tips: [
      msg('Make large photos smaller (about 1600 pixels wide) before uploading, so pages load quickly on phones.'),
      msg('Only publish photos the school is allowed to use, and have parents’ consent for photos of children.'),
    ],
  },
  {
    id: 'settings',
    icon: 'fa-solid fa-sliders',
    title: msg('Header, footer and contact details'),
    intro: msg('The school name and logo at the top of every page, the footer, contact details, social links and the application form are edited in Site settings.'),
    open: { to: '/admin/settings', label: msg('Site settings') },
    steps: [
      {
        items: [
          msg('Open **Site settings**.'),
          msg('Choose the language at the top, then change the fields you need (see the list below).'),
          msg('Click **Save settings**.'),
          msg('Click **Publish** in the top bar to show the changes on the website.'),
        ],
      },
    ],
    tips: [
      msg('Check phone numbers, email and address carefully: families use them to contact the school.'),
      msg('The grades offered in the application form are edited under **Grade options**.'),
    ],
    extra: 'settings',
  },
  {
    id: 'translations',
    icon: 'fa-solid fa-language',
    title: msg('Translations'),
    intro: msg('English is the source language. Everything is translated from English into the language you choose, and the translation is used everywhere on the website. Text that is not translated shows in English.'),
    open: { to: '/admin/translations', label: msg('Translations') },
    steps: [
      {
        heading: msg('Start translating'),
        items: [
          msg('Write or change the English text first, in the page editor, Menu settings or Site settings.'),
          msg('Open **Translations** and choose the language in the **Translate into** list. The percentage shows how much is done.'),
          msg('Pick a tab: **Label translate** for interface wording, **Content translate** for descriptions and page text.'),
          msg('Each row shows the English text on the left. Type the translation on the right, or use **Copy English** or **Auto-translate** (when it is switched on).'),
          msg('Click **Save** on the part you translated, then **Publish** to show it on the website.'),
        ],
      },
      {
        heading: msg('Label translate: menus, buttons and other interface wording'),
        items: [
          msg('**Menu bar**: the names of the pages and links in the top menu.'),
          msg('**Header & footer**: short labels such as the school name, tagline, Dashboard button, footer name, application form title and grade names.'),
          msg('**Website text**: fixed wording on the website such as buttons, form labels and short messages.'),
          msg('**Admin panel text**: the wording of this admin panel, including this manual. It is used right away, no publishing needed.'),
        ],
      },
      {
        heading: msg('Content translate: descriptions and page text'),
        items: [
          msg('Choose **Header & footer** at the top of the list for the longer texts shown on every page: footer text, address, search-engine description and the application pop-up.'),
          msg('Or choose a page. The number next to a page shows how many texts are still missing.'),
          msg('Each block of the page (Hero banner, Statistics, Feature cards, Call to action…) has its own card with all its texts, including every card or number in it.'),
          msg('Switch on **Only untranslated** to see only what is still missing, and use **Auto-translate page** to fill a whole page at once.'),
        ],
      },
    ],
    tips: [
      msg('The language list at the top of the admin panel only changes the language of this admin panel. The language you translate into is chosen in **Translate into**.'),
      msg('You can still translate while editing: the language switch in the page editor and Site settings shows the same languages. **Open in Translations** jumps to the same text here.'),
      msg('Auto-translate only fills empty fields. Ask a fluent speaker to check machine translations before publishing.'),
      msg('Keep placeholders such as {name} and the ** and __ marks unchanged when translating.'),
    ],
  },
  {
    id: 'languages',
    icon: 'fa-solid fa-earth-asia',
    title: msg('Languages'),
    intro: msg('This screen adds or removes languages and sets the font of each language. Translating is done in Translations.'),
    open: { to: '/admin/languages', label: msg('Languages') },
    steps: [
      {
        heading: msg('Add a language'),
        items: [
          msg('Open **Languages** and click **Add language**.'),
          msg('Pick one from **Quick pick**, or type its code and name, for example hmn and Hmoob.'),
          msg('Set the **Switch label**, the short name shown on the website language switch (for example HMN).'),
          msg('Optional: under **Font**, click **Upload font** to give the language its own font (WOFF2, WOFF, TTF or OTF, up to 10 MB).'),
          msg('New languages start hidden. Translate the website in **Translations**, then switch on **Shown on website** and publish.'),
        ],
      },
      {
        heading: msg('Change or remove a font'),
        items: [
          msg('Click the pen icon on the language. Under **Font**, use **Change font** to upload another file or **Remove font** to go back to the default font, then click **Save**.'),
          msg('The font switches automatically with the language: when a visitor or staff member picks this language, every page, menu, label and text uses its font. Publish to apply it to the public website.'),
        ],
      },
      {
        heading: msg('Remove a language'),
        items: [
          msg('Click the bin icon on the language and confirm. It disappears from the language switch after you publish.'),
          msg('Its translations are kept, so adding the language again brings them back.'),
        ],
      },
    ],
  },
  {
    id: 'publish',
    icon: 'fa-solid fa-rocket',
    title: msg('Publish and undo'),
    intro: msg('Publishing copies the draft to the live website and keeps a numbered version, so any publish can be undone.'),
    open: { to: '/admin/publish', label: msg('Publish & history') },
    steps: [
      {
        heading: msg('Publish your changes'),
        items: [
          msg('Click **Preview draft** and check every changed page, in each language and on a phone.'),
          msg('Click **Publish** in the top bar. Read the list of **Changes since last publish**.'),
          msg('Write a short **Note**, for example: New term calendar.'),
          msg('Click **Publish now**, then open the live website to check.'),
        ],
      },
      {
        heading: msg('Undo a publish (go back to an older version)'),
        items: [
          msg('Open **Publish & history** and find the last good version in **History**.'),
          msg('Click **Restore to draft**. The live website does not change yet.'),
          msg('Check the draft, then click **Publish** to make the old version live again.'),
        ],
      },
    ],
    tips: [
      msg('Restore replaces the current draft. Publish or note any unfinished edits first.'),
      msg('Ask the principal to approve changes to fees, dates, admission rules or contact details before publishing.'),
    ],
  },
  {
    id: 'applications',
    icon: 'fa-solid fa-inbox',
    title: msg('Admission applications'),
    intro: msg('Requests sent from the “Apply now” pop-up and the Application form block arrive here. They are not published on the website.'),
    open: { to: '/admin/applications', label: msg('Applications') },
    steps: [
      {
        items: [
          msg('Open **Applications**. New requests have the status **new**.'),
          msg('Click a request to see its details: parent, phone, child, grade and message.'),
          msg('Contact the family, then set the status to **contacted** and write what was agreed in **Internal notes**.'),
          msg('Set **enrolled** when the child is enrolled, or **archived** when the request is closed.'),
          msg('Use the status filter and **Search name or phone…** to find requests.'),
        ],
      },
    ],
    tips: [
      msg('Check for new applications every working day and reply within two working days.'),
      msg('Applications contain personal information. Do not copy them to personal phones or chat groups.'),
    ],
  },
  {
    id: 'accounts',
    icon: 'fa-solid fa-user-shield',
    title: msg('Administrators and your account'),
    intro: msg('Every staff member who edits the website has their own account. All administrators can use every screen.'),
    open: { to: '/admin/users', label: msg('Administrators') },
    steps: [
      {
        heading: msg('Your own password'),
        items: [
          msg('Click your name in the top-right corner and choose **Change password**.'),
          msg('Enter your current password and the new one twice (at least 8 characters), then **Save password**.'),
          msg('Use **Sign out** in the same menu when you finish, especially on a shared computer.'),
        ],
      },
      {
        heading: msg('Add or remove a staff member'),
        items: [
          msg('Open **Administrators** and click **Add administrator**. Enter their name, username and a temporary password.'),
          msg('Give the temporary password to the person directly, and ask them to change it at first sign-in.'),
          msg('When someone leaves, open their account and switch off **Account active (can sign in)**. They are signed out immediately.'),
          msg('If someone forgets their password, open their account, type a new one in **Reset password** and save.'),
        ],
      },
    ],
    tips: [
      msg('Never share an account or write passwords in chat. After 8 wrong passwords, sign-in is blocked for 15 minutes.'),
    ],
  },
  {
    id: 'faq',
    icon: 'fa-solid fa-circle-question',
    title: msg('Common questions'),
    intro: msg('Quick answers to problems staff often meet.'),
    steps: [
      {
        items: [
          msg('__My change is not on the website.__ It is still a draft. Click **Publish** in the top bar.'),
          msg('__A page is missing from the menu bar.__ In Menu settings, switch on **Published on site** and **Show in top menu**, then publish.'),
          msg('__The text shows in English on the Lao site.__ That text is not translated yet. Open **Translations**, choose Lao, translate it and publish.'),
          msg('__An image is missing after an update.__ Upload it again from the Library or your computer and publish. Tell the system administrator if it happens often.'),
          msg('__I published a mistake.__ Restore the previous version from **Publish & history** and publish it.'),
          msg('__I cannot sign in.__ Wait 15 minutes after many wrong passwords, or ask another administrator to reset your password.'),
        ],
      },
    ],
  },
];

/** Renders "Click **Publish** now": **UI names** as highlighted chips, __emphasis__ in bold. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|__.+?__)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
          return <span key={i} className="font-semibold text-slate-900 bg-slate-100 rounded px-1 py-px">{p.slice(2, -2)}</span>;
        }
        if (p.startsWith('__') && p.endsWith('__') && p.length > 4) {
          return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function sectionText(s: Section, at: AT): string {
  const parts = [s.title, s.intro, ...s.steps.flatMap((g) => [g.heading ?? '', ...g.items]), ...(s.tips ?? [])];
  if (s.extra === 'blocks') BLOCK_SCHEMAS.forEach((b) => parts.push(b.name, b.description));
  if (s.extra === 'settings') SETTINGS_GROUPS.forEach((g) => parts.push(g.title, ...g.fields.map((f) => f.label)));
  return parts.map((p) => at(p)).join(' ').replace(/\*\*|__/g, '').toLowerCase();
}

function BlockGuide({ at }: { at: AT }) {
  return (
    <div className="mt-5">
      <h4 className="font-bold text-slate-900 mb-1">{at('Block guide')}</h4>
      <p className="text-sm text-slate-500 mb-3">{at('What each block looks like on the website and which fields it has. Click a block to see its fields.')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {BLOCK_SCHEMAS.map((b) => (
          <details key={b.type} className="group rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer list-none flex items-start gap-3 p-3">
              <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><i className={b.icon} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-slate-900 text-sm">{at(b.name)}</span>
                <span className="block text-xs text-slate-500">{at(b.description)}</span>
              </span>
              <i className="fa-solid fa-chevron-down text-[10px] text-slate-400 mt-2 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="px-4 pb-3 pt-0 text-xs text-slate-600 space-y-1 border-t border-slate-100 mt-0">
              {b.fields.map((f) => (
                <li key={f.key} className="pt-1.5">
                  <span className="font-semibold text-slate-800">{at(f.label)}</span>
                  {f.help && <span className="text-slate-500">: {at(f.help)}</span>}
                  {f.type === 'list' && f.fields && (
                    <span className="text-slate-500"> ({f.fields.map((sf) => at(sf.label)).join(', ')})</span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

function SettingsGuide({ at }: { at: AT }) {
  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {SETTINGS_GROUPS.map((g) => (
        <div key={g.title} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="font-semibold text-slate-900 text-sm">{at(g.title)}</div>
          {g.description && <div className="text-xs text-slate-500 mb-1">{at(g.description)}</div>}
          <div className="text-xs text-slate-600">{g.fields.map((f) => at(f.label)).join(' · ')}</div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ s, at }: { s: Section; at: AT }) {
  return (
    <section id={`help-${s.id}`} className="card p-5 sm:p-6 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
        <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-lg shrink-0"><i className={s.icon} /></span>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 text-lg leading-tight">{at(s.title)}</h3>
          <p className="text-sm text-slate-500 mt-1">{at(s.intro)}</p>
        </div>
        {s.open && (
          <Link to={s.open.to} className="btn-secondary !py-1.5 !px-3 !text-xs shrink-0 self-start">
            {at('Open {screen}', { screen: at(s.open.label) })} <i className="fa-solid fa-arrow-right" />
          </Link>
        )}
      </div>

      <div className="space-y-5">
        {s.steps.map((g, gi) => (
          <div key={gi}>
            {g.heading && <h4 className="font-semibold text-slate-800 mb-2">{at(g.heading)}</h4>}
            <ol className="space-y-2">
              {g.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="flex-1"><Rich text={at(item)} /></span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {s.extra === 'blocks' && <BlockGuide at={at} />}
      {s.extra === 'settings' && <SettingsGuide at={at} />}

      {s.tips && s.tips.length > 0 && (
        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-100 p-3.5">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1.5"><i className="fa-solid fa-lightbulb" /> {at('Tips')}</div>
          <ul className="space-y-1.5 text-sm text-amber-900">
            {s.tips.map((t, i) => <li key={i}><Rich text={at(t)} /></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

export function HelpPage() {
  const at = useAT();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q ? SECTIONS.filter((s) => sectionText(s, at).includes(q)) : SECTIONS), [q, at]);

  const go = (id: string) => {
    setQuery('');
    // Wait for a filtered list to re-render before scrolling.
    requestAnimationFrame(() => document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Support links such as /admin/help#help-menu.
  useEffect(() => {
    const id = window.location.hash.replace(/^#help-/, '');
    if (id) go(id);
  }, []);

  return (
    <>
      <PageTitle title={at('User manual')} subtitle={at('Step-by-step guides for managing the menu bar, pages and every part of the website.')} />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        <nav className="lg:sticky lg:top-24 card p-3 space-y-0.5" aria-label={at('User manual')}>
          <div className="relative mb-2">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input className="input !pl-8 !py-2 text-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={at('Search the manual…')} />
          </div>
          <button
            type="button"
            onClick={() => go('pagemap')}
            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold text-amber-700 hover:bg-amber-50"
          >
            <i className="fa-solid fa-map w-4 text-center" /> <span className="truncate">{at('Page map')}</span>
          </button>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-800"
            >
              <i className={`${s.icon} w-4 text-center text-slate-400`} /> <span className="truncate">{at(s.title)}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-6 min-w-0">
          {!q && <PageMap />}
          {shown.map((s) => <SectionCard key={s.id} s={s} at={at} />)}
          {shown.length === 0 && (
            <div className="card p-8 text-center text-slate-500 text-sm">{at('Nothing in the manual matches “{text}”.', { text: query })}</div>
          )}
        </div>
      </div>
    </>
  );
}
