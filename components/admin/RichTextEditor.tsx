'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Printer,
  Redo2,
  Search,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Type,
  Underline,
  Undo2,
  Video,
} from 'lucide-react';
import { sanitizeWordHtml, wordCountFromHtml } from '@/lib/sanitize-html';
import { uploadMediaFile } from '@/lib/upload-media';
import FaqEditor from '@/components/admin/FaqEditor';
import type { PageFaq } from '@/lib/cms-page-model';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  showFooter?: boolean;
  faqs?: PageFaq[];
  onFaqsChange?: (faqs: PageFaq[]) => void;
  faqTitle?: string;
  faqDescription?: string;
};

const TABS = ['File', 'Home', 'Insert', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View', 'Help'] as const;
type Tab = (typeof TABS)[number];

const FONTS = ['Calibri', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Inter', 'Playfair Display', 'Helvetica', 'Roboto'];
const SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '36px', '48px', '72px'];
const LINE_HEIGHTS = ['1', '1.15', '1.5', '2'];
const SPECIALS = ['©', '®', '™', '°', '•', '–', '—', '€', '£', '¥'];
const COLORS = ['#111827', '#00A651', '#1d4ed8', '#b91c1c', '#c2410c', '#6d28d9', '#ffffff'];

function ToolbarButton({
  children,
  title,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      className={`flex h-8 min-w-[32px] items-center justify-center rounded border px-1.5 text-[#374151] ${
        active ? 'border-[#00A651] bg-white' : 'border-transparent hover:border-[#d1d5db] hover:bg-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type description here...',
  showFooter = true,
  faqs,
  onFaqsChange,
  faqTitle = 'FAQ',
  faqDescription,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('Home');
  const [font, setFont] = useState('Roboto');
  const [size, setSize] = useState('16px');
  const [mediaStatus, setMediaStatus] = useState('');
  const wordCount = wordCountFromHtml(value);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    if (node.innerHTML !== value) {
      node.innerHTML = value || '';
    }
  }, [value]);

  function run(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emit();
  }

  function emit() {
    onChange(editorRef.current?.innerHTML || '');
  }

  function insertHtml(html: string) {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emit();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData('text/html');
    if (html) {
      event.preventDefault();
      insertHtml(sanitizeWordHtml(html));
      return;
    }
    const text = event.clipboardData.getData('text/plain');
    if (text) {
      event.preventDefault();
      const paragraphs = text
        .split(/\n{2,}/)
        .map((part) => part.replace(/\n/g, '<br />'))
        .map(
          (part) =>
            `<p style="font-family: system-ui, -apple-system, Roboto, 'Helvetica Neue', sans-serif; text-align: justify">${part}</p>`
        )
        .join('');
      insertHtml(sanitizeWordHtml(paragraphs || text));
    }
  }

  function addLink() {
    const href = window.prompt('Insert link URL', 'https://');
    if (href) run('createLink', href);
  }

  function addImage() {
    imageInputRef.current?.click();
  }

  function addVideo() {
    videoInputRef.current?.click();
  }

  function markSelectedMedia(event: React.MouseEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll('[data-eton-media]').forEach((node) => node.removeAttribute('data-eton-media'));
    const target = (event.target as HTMLElement).closest('img, video');
    if (target && editor.contains(target)) {
      target.setAttribute('data-eton-media', '1');
    }
  }

  async function handleMediaFile(file: File | undefined, kind: 'image' | 'video') {
    if (!file) return;
    setMediaStatus(kind === 'image' ? 'Uploading image…' : 'Compressing video for faster loading…');
    try {
      const url = await uploadMediaFile(file, 'editor', {
        onStatus: kind === 'video' ? setMediaStatus : undefined,
      });
      const editor = editorRef.current;
      const selected = editor?.querySelector(kind === 'image' ? 'img[data-eton-media]' : 'video[data-eton-media]');
      if (selected) {
        selected.setAttribute('src', url);
        emit();
      } else if (kind === 'image') {
        insertHtml(`<img src="${url}" alt="" style="max-width:100%" />`);
      } else {
        insertHtml(`<p><video src="${url}" controls style="max-width:100%"></video></p>`);
      }
      setMediaStatus(kind === 'image' ? 'Image updated.' : 'Video updated.');
    } catch (error) {
      setMediaStatus(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  function addTable() {
    insertHtml(
      '<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td></tr></tbody></table>'
    );
  }

  function addDate() {
    insertHtml(`<span>${new Date().toLocaleString()}</span>`);
  }

  function printEditor() {
    const content = editorRef.current?.innerHTML || '';
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.document.write(`<html><body>${content}</body></html>`);
    popup.document.close();
    popup.print();
  }

  function findReplace() {
    const needle = window.prompt('Find text');
    if (!needle) return;
    const replacement = window.prompt('Replace with', '') ?? '';
    const next = (editorRef.current?.innerHTML || '').split(needle).join(replacement);
    onChange(next);
  }

  return (
    <div className="wysiwyg-editor-container w-full overflow-hidden rounded-lg border border-[#e5e7eb] bg-white focus-within:border-[#00A651] focus-within:ring-2 focus-within:ring-[#00A651]/20">
      <div className="flex w-full flex-wrap border-b border-[#e5e7eb] bg-[#f3f4f6]">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`px-3 py-2 text-[11px] font-semibold ${
              tab === item ? 'border-b-2 border-[#2b579a] bg-white text-[#2b579a]' : 'text-[#4b5563] hover:bg-white/70'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center gap-0.5 border-b border-[#e5e7eb] bg-[#f8fafc] px-2 py-1.5">
        <ToolbarButton title="Browse or update image" onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Browse or update video" onClick={addVideo}>
          <Video className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-[#d1d5db]" />
        {tab === 'File' && (
          <>
            <ToolbarButton title="Print" onClick={printEditor}>
              <Printer className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Clear" onClick={() => onChange('')}>
              Delete
            </ToolbarButton>
            <span className="ml-2 text-xs text-[#6b7280]">Word Count: {wordCount}</span>
          </>
        )}
        {tab === 'Home' && (
          <>
            <ToolbarButton title="Undo" onClick={() => run('undo')}>
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Redo" onClick={() => run('redo')}>
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
            <select
              value={font}
              onChange={(event) => {
                setFont(event.target.value);
                run('fontName', event.target.value);
              }}
              className="h-8 rounded border border-[#d1d5db] bg-white px-2 text-xs"
            >
              {FONTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={size}
              onChange={(event) => {
                setSize(event.target.value);
                document.execCommand('styleWithCSS', false, 'true');
                run('fontSize', '4');
                const selection = window.getSelection();
                if (selection?.anchorNode?.parentElement) {
                  selection.anchorNode.parentElement.style.fontSize = event.target.value;
                }
                emit();
              }}
              className="h-8 rounded border border-[#d1d5db] bg-white px-2 text-xs"
            >
              {SIZES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              defaultValue="p"
              onChange={(event) => {
                run('formatBlock', event.target.value);
                emit();
              }}
              className="h-8 rounded border border-[#d1d5db] bg-white px-2 text-xs"
              title="Styles"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
              <option value="blockquote">Quote</option>
            </select>
            <ToolbarButton title="Increase font" onClick={() => run('increaseFontSize')}>
              <Type className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Bold" onClick={() => run('bold')}>
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Italic" onClick={() => run('italic')}>
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Underline" onClick={() => run('underline')}>
              <Underline className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Strikethrough" onClick={() => run('strikeThrough')}>
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Subscript" onClick={() => run('subscript')}>
              <Subscript className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Superscript" onClick={() => run('superscript')}>
              <Superscript className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Clear formatting" onClick={() => run('removeFormat')}>
              Clear
            </ToolbarButton>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={`Text ${color}`}
                className="h-4 w-4 rounded-full border"
                style={{ background: color }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  run('foreColor', color);
                }}
              />
            ))}
            <ToolbarButton title="Highlight" onClick={() => run('hiliteColor', '#fde68a')}>
              <Highlighter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Align left" onClick={() => run('justifyLeft')}>
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Align center" onClick={() => run('justifyCenter')}>
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Align right" onClick={() => run('justifyRight')}>
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Justify" onClick={() => run('justifyFull')}>
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Find / Replace" onClick={findReplace}>
              <Search className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Bullets" onClick={() => run('insertUnorderedList')}>
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Numbering" onClick={() => run('insertOrderedList')}>
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}
        {tab === 'Insert' && (
          <>
            <ToolbarButton title="Link" onClick={addLink}>
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Table" onClick={addTable}>
              <Table className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Divider" onClick={() => insertHtml('<hr />')}>
              <Minus className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Code" onClick={() => insertHtml('<pre><code>code</code></pre>')}>
              <Code className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Date/Time" onClick={addDate}>
              Date
            </ToolbarButton>
            {SPECIALS.map((item) => (
              <ToolbarButton key={item} title={`Insert ${item}`} onClick={() => insertHtml(item)}>
                {item}
              </ToolbarButton>
            ))}
          </>
        )}
        {tab === 'Design' && COLORS.map((color) => (
          <button
            key={`design-${color}`}
            type="button"
            className="h-5 w-5 rounded border"
            style={{ background: color }}
            onMouseDown={(event) => {
              event.preventDefault();
              run('hiliteColor', color);
            }}
          />
        ))}
        {tab === 'Layout' && (
          <>
            <ToolbarButton title="Align left" onClick={() => run('justifyLeft')}>
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Align center" onClick={() => run('justifyCenter')}>
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Align right" onClick={() => run('justifyRight')}>
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Justify" onClick={() => run('justifyFull')}>
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Increase indent" onClick={() => run('indent')}>
              <IndentIncrease className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Decrease indent" onClick={() => run('outdent')}>
              <IndentDecrease className="h-4 w-4" />
            </ToolbarButton>
            <select
              defaultValue="1.5"
              onChange={(event) => {
                const height = event.target.value;
                document.execCommand('styleWithCSS', false, 'true');
                const selection = window.getSelection();
                const block = selection?.anchorNode instanceof Element
                  ? selection.anchorNode
                  : selection?.anchorNode?.parentElement;
                if (block) {
                  (block as HTMLElement).style.lineHeight = height;
                  emit();
                }
              }}
              className="h-8 rounded border border-[#d1d5db] bg-white px-2 text-xs"
              title="Line spacing"
            >
              {LINE_HEIGHTS.map((item) => (
                <option key={item} value={item}>
                  Line {item}
                </option>
              ))}
            </select>
          </>
        )}
        {tab === 'Review' && (
          <ToolbarButton title="Find / Replace" onClick={findReplace}>
            <Search className="h-4 w-4" />
          </ToolbarButton>
        )}
        {(tab === 'References' || tab === 'Mailings' || tab === 'View' || tab === 'Help') && (
          <p className="px-2 text-xs text-[#6b7280]">
            {tab === 'Help' ? 'Press Alt+0 for editor help. Pasted Word/Google Docs formatting is kept unless you clear it from the toolbar.' : `${tab} tools are available in Home and Insert.`}
          </p>
        )}
      </div>
      {mediaStatus ? (
        <p className="border-b border-[#e5e7eb] bg-[#f0fdf4] px-3 py-1 text-xs text-[#166534]">{mediaStatus}</p>
      ) : null}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Browse image"
        onChange={(event) => {
          void handleMediaFile(event.target.files?.[0], 'image');
          event.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
        className="hidden"
        aria-label="Browse video"
        onChange={(event) => {
          void handleMediaFile(event.target.files?.[0], 'video');
          event.target.value = '';
        }}
      />

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label="Post content"
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={handlePaste}
        onClick={markSelectedMedia}
        className={`description-box w-full resize-y overflow-auto bg-white px-3 py-3 text-[15px] leading-[1.6] text-[#111827] outline-none empty:before:text-[#9ca3af] empty:before:content-[attr(data-placeholder)] [&_img[data-eton-media]]:ring-2 [&_img[data-eton-media]]:ring-[#00A651] [&_video[data-eton-media]]:ring-2 [&_video[data-eton-media]]:ring-[#00A651] ${
          onFaqsChange ? 'description-box--with-faq' : ''
        }`}
        style={{ fontFamily: 'system-ui, -apple-system, Roboto, "Helvetica Neue", sans-serif', textAlign: 'justify' }}
      />

      {onFaqsChange ? (
        <FaqEditor
          faqs={faqs || []}
          onChange={onFaqsChange}
          title={faqTitle}
          description={faqDescription}
        />
      ) : null}

      {showFooter && (
        <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#fafafa] px-4 py-2 text-xs text-[#6b7280]">
          <span>Word Count: {wordCount}</span>
          <span>Pasted formatting is kept unless you change it with the toolbar</span>
        </div>
      )}
    </div>
  );
}
