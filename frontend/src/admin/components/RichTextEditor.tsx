import Link from '@tiptap/extension-link';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { PROSE } from '../../public/blocks/RichText';
import { isSafeUrl } from '../../lib/url';

function ToolButton({ onClick, active, icon, label, disabled }: { onClick: () => void; active?: boolean; icon: string; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition disabled:opacity-30 ${active ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      <i className={icon} />
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (https://…, mailto:, tel: or /page)', prev ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!isSafeUrl(url)) {
      window.alert('That link is not allowed. Use https://…, mailto:, tel: or a site path like /about.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
      <ToolButton icon="fa-solid fa-bold" label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton icon="fa-solid fa-italic" label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton icon="fa-solid fa-strikethrough" label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <span className="w-px h-5 bg-slate-200 mx-1" />
      <ToolButton icon="fa-solid fa-heading" label="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <button
        type="button"
        title="Subheading"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`h-8 px-2 rounded-lg text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        H3
      </button>
      <ToolButton icon="fa-solid fa-list-ul" label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton icon="fa-solid fa-list-ol" label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolButton icon="fa-solid fa-quote-left" label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolButton icon="fa-solid fa-link" label="Link" active={editor.isActive('link')} onClick={setLink} />
      <ToolButton icon="fa-solid fa-minus" label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      <span className="w-px h-5 bg-slate-200 mx-1" />
      <ToolButton icon="fa-solid fa-rotate-left" label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      <ToolButton icon="fa-solid fa-rotate-right" label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, code: false, codeBlock: false }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ['mailto', 'tel'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: `${PROSE} tiptap px-4 py-3`,
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Keep the editor in sync if the value is replaced from outside (e.g. "discard changes").
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = current === '<p></p>' ? '' : current;
    if ((value || '') !== normalized) editor.commands.setContent(value || '', false);
  }, [value, editor]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
