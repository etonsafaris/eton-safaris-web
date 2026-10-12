'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Anchor,
  Bold,
  Code,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Paintbrush,
  Pilcrow,
  Printer,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
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

const MENUS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Table', 'Help'] as const;
type MenuName = (typeof MENUS)[number];

const FONTS = [
  ['Calibri', 'Calibri, sans-serif'],
  ['Arial', 'Arial, Helvetica, sans-serif'],
  ['Times New Roman', '"Times New Roman", Times, serif'],
  ['Courier New', '"Courier New", Courier, monospace'],
  ['Georgia', 'Georgia, Palatino, serif'],
  ['Verdana', 'Verdana, Geneva, sans-serif'],
] as const;
const SIZES = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '36pt', '48pt', '72pt'];
const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3'];
const ZOOMS = ['50', '75', '90', '100', '125', '150', '175', '200'];
const SPECIALS = ['©', '®', '™', '°', '•', '–', '—', '€', '£', '¥', '§', '¶', '†', '‡'];
const EMOJIS = ['😀', '😊', '👍', '❤️', '🔥', '✨', '🦁', '🐘', '🦒', '🌍'];
const SPACING = [
  ['Tight (-0.5pt)', '-0.5pt'],
  ['Normal (0pt)', '0pt'],
  ['Wide (1pt)', '1pt'],
  ['Wider (2pt)', '2pt'],
  ['Widest (4pt)', '4pt'],
] as const;

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
      className={`flex h-8 min-w-[32px] items-center justify-center rounded border px-1.5 text-[#374151] dark:text-gray-200 ${
        active
          ? 'border-[#00A651] bg-white dark:bg-[#1e293b]'
          : 'border-transparent hover:border-[#d1d5db] hover:bg-white dark:hover:border-white/20 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function MenuPanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded border border-[#ccc] bg-white py-1 text-left shadow-lg dark:border-white/10 dark:bg-[#1e293b]">
      {children}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className="block w-full px-3 py-1.5 text-left text-xs text-[#222] hover:bg-[#e8f1ff] dark:text-gray-100 dark:hover:bg-white/10"
    >
      {label}
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
  const [tab, setTab] = useState<MenuName | null>(null);
  const [font, setFont] = useState('Calibri');
  const [size, setSize] = useState('11pt');
  const [lineHeight, setLineHeight] = useState('1.15');
  const [zoom, setZoom] = useState('100');
  const [fullscreen, setFullscreen] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  const painterRef = useRef<string | null>(null);
  const [painterOn, setPainterOn] = useState(false);
  const [mediaStatus, setMediaStatus] = useState('');
  const wordCount = wordCountFromHtml(value);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    if (node.innerHTML !== value) {
      node.innerHTML = value || '';
    }
  }, [value]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && fullscreen) setFullscreen(false);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [fullscreen]);

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
      setImageSelected(target.tagName === 'IMG');
    } else {
      setImageSelected(false);
    }
    const item = (event.target as HTMLElement).closest('ul.tox-checklist > li');
    if (item && event.nativeEvent.offsetX < 24) {
      item.classList.toggle('tox-checklist--checked');
      emit();
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
        insertHtml(`<img src="${url}" alt="" style="max-width:100%" loading="lazy" decoding="async" />`);
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

  function closeMenu() {
    setTab(null);
  }

  function selectedBlock() {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element = node instanceof Element ? node : node?.parentElement;
    return element?.closest('p,h1,h2,h3,h4,h5,li,blockquote,div') as HTMLElement | null;
  }

  function applyFontSize(next: string) {
    setSize(next);
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((node) => {
      const span = document.createElement('span');
      span.style.fontSize = next;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
    emit();
  }

  function applyLetterSpacing(valueSpacing: string) {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const span = document.createElement('span');
    span.style.letterSpacing = valueSpacing;
    const range = selection.getRangeAt(0);
    try {
      range.surroundContents(span);
    } catch {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    emit();
  }

  function applyLineHeight(next: string) {
    setLineHeight(next);
    const block = selectedBlock();
    if (block) {
      block.style.lineHeight = next;
      emit();
    }
  }

  function toggleDropCap() {
    const block = selectedBlock()?.closest('p');
    if (!block) return;
    block.classList.toggle('drop-cap');
    emit();
  }

  function setColumns(count: 1 | 2 | 3) {
    const current = selectedBlock()?.closest('.col-2,.col-3') as HTMLElement | null;
    if (count === 1) {
      current?.classList.remove('col-2', 'col-3');
      emit();
      return;
    }
    insertHtml(`<div class="col-${count}"><p>Start writing here...</p></div><p></p>`);
  }

  function copyFormat() {
    const block = selectedBlock();
    if (!block) return;
    painterRef.current = block.style.cssText;
    setPainterOn(true);
  }

  function applyPainter() {
    if (!painterRef.current) return;
    const block = selectedBlock();
    if (!block) return;
    block.style.cssText = painterRef.current;
    painterRef.current = null;
    setPainterOn(false);
    emit();
  }

  function selectedImage() {
    return editorRef.current?.querySelector('img[data-eton-media]') as HTMLImageElement | null;
  }

  function layoutImage(mode: 'inline' | 'left' | 'right' | 'center' | 'topleft' | 'topright') {
    const image = selectedImage();
    if (!image) return;
    const styles: Record<string, Partial<CSSStyleDeclaration>> = {
      inline: { float: '', display: 'inline', margin: '0 6px 4px 0', verticalAlign: 'middle' },
      left: { float: 'left', display: 'inline', margin: '0 20px 12px 0', verticalAlign: '' },
      right: { float: 'right', display: 'inline', margin: '0 0 12px 20px', verticalAlign: '' },
      center: { float: '', display: 'block', margin: '12px auto', verticalAlign: '' },
      topleft: { float: 'left', display: 'inline', margin: '0 20px 0 0', verticalAlign: 'top' },
      topright: { float: 'right', display: 'inline', margin: '0 0 0 20px', verticalAlign: 'top' },
    };
    Object.assign(image.style, styles[mode]);
    emit();
  }

  function transformImage(kind: 'left' | 'right' | 'flipv' | 'fliph') {
    const image = selectedImage();
    if (!image) return;
    const rotate = Number(image.dataset.rotate || '0');
    const nextRotate = kind === 'left' ? rotate - 90 : kind === 'right' ? rotate + 90 : rotate;
    image.dataset.rotate = String((nextRotate % 360 + 360) % 360);
    if (kind === 'flipv') image.dataset.flipv = image.dataset.flipv === '1' ? '0' : '1';
    if (kind === 'fliph') image.dataset.fliph = image.dataset.fliph === '1' ? '0' : '1';
    const flipY = image.dataset.flipv === '1' ? 'scaleY(-1)' : '';
    const flipX = image.dataset.fliph === '1' ? 'scaleX(-1)' : '';
    image.style.transform = `rotate(${image.dataset.rotate}deg) ${flipX} ${flipY}`.trim();
    emit();
  }

  function insertChecklist() {
    insertHtml('<ul class="tox-checklist"><li>List item</li></ul>');
  }

  function insertAnchor() {
    const name = window.prompt('Anchor name');
    if (!name) return;
    insertHtml(`<a id="${name.replace(/[^a-z0-9_-]/gi, '')}"></a>`);
  }

  function insertContents() {
    const editor = editorRef.current;
    if (!editor) return;
    const headings = [...editor.querySelectorAll('h1,h2,h3')];
    const items = headings
      .map((heading, index) => {
        const id = heading.id || `heading-${index + 1}`;
        heading.id = id;
        return `<li><a href="#${id}">${heading.textContent || 'Heading'}</a></li>`;
      })
      .join('');
    insertHtml(`<div class="mce-toc"><p><strong>Table of Contents</strong></p><ul>${items || '<li>Add headings first</li>'}</ul></div>`);
  }

  function insertPageBreak() {
    insertHtml('<div class="mce-pagebreak" style="page-break-after: always; border-top: 1px dashed #ccc; margin: 16pt 0;"></div>');
  }

  return (
    <div className={`wysiwyg-editor-container w-full overflow-hidden border border-[#ccc] bg-white focus-within:border-[#2276d2] dark:border-white/10 dark:bg-[#1e293b] ${
      fullscreen ? 'is-fullscreen fixed inset-0 z-[80] flex flex-col rounded-none' : 'rounded'
    }`}>
      <div className="flex w-full flex-wrap border-b border-[#e3e3e3] bg-white dark:border-white/10 dark:bg-[#0f172a]">
        {MENUS.map((item) => (
          <div key={item} className="relative">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                setTab((current) => (current === item ? null : item));
              }}
              className={`px-3 py-1.5 text-[13px] ${
                tab === item ? 'bg-[#e8f1ff] text-[#222] dark:bg-white/10 dark:text-white' : 'text-[#222] hover:bg-[#f0f0f0] dark:text-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {item}
            </button>
            <MenuPanel open={tab === item}>
              {item === 'File' ? (
                <>
                  <MenuItem label="Print" onClick={() => { closeMenu(); printEditor(); }} />
                </>
              ) : null}
              {item === 'Edit' ? (
                <>
                  <MenuItem label="Undo" onClick={() => { closeMenu(); run('undo'); }} />
                  <MenuItem label="Redo" onClick={() => { closeMenu(); run('redo'); }} />
                  <MenuItem label="Select all" onClick={() => { closeMenu(); run('selectAll'); }} />
                  <MenuItem label="Find and replace" onClick={() => { closeMenu(); findReplace(); }} />
                </>
              ) : null}
              {item === 'View' ? (
                <>
                  <MenuItem label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => { closeMenu(); setFullscreen((valueOpen) => !valueOpen); }} />
                  {ZOOMS.map((level) => (
                    <MenuItem key={level} label={`Zoom ${level}%`} onClick={() => { closeMenu(); setZoom(level); }} />
                  ))}
                </>
              ) : null}
              {item === 'Insert' ? (
                <>
                  <MenuItem label="Link" onClick={() => { closeMenu(); addLink(); }} />
                  <MenuItem label="Image" onClick={() => { closeMenu(); addImage(); }} />
                  <MenuItem label="Video" onClick={() => { closeMenu(); addVideo(); }} />
                  <MenuItem label="Table" onClick={() => { closeMenu(); addTable(); }} />
                  <MenuItem label="Horizontal line" onClick={() => { closeMenu(); insertHtml('<hr />'); }} />
                  <MenuItem label="Code sample" onClick={() => { closeMenu(); insertHtml('<pre><code>code</code></pre>'); }} />
                  <MenuItem label="Page break" onClick={() => { closeMenu(); insertPageBreak(); }} />
                  <MenuItem label="Anchor" onClick={() => { closeMenu(); insertAnchor(); }} />
                  <MenuItem label="Table of contents" onClick={() => { closeMenu(); insertContents(); }} />
                  <MenuItem label="Date/time" onClick={() => { closeMenu(); addDate(); }} />
                  <MenuItem label="Checklist" onClick={() => { closeMenu(); insertChecklist(); }} />
                </>
              ) : null}
              {item === 'Format' ? (
                <>
                  <MenuItem label="Bold" onClick={() => { closeMenu(); run('bold'); }} />
                  <MenuItem label="Italic" onClick={() => { closeMenu(); run('italic'); }} />
                  <MenuItem label="Underline" onClick={() => { closeMenu(); run('underline'); }} />
                  <MenuItem label="Strikethrough" onClick={() => { closeMenu(); run('strikeThrough'); }} />
                  <MenuItem label="Superscript" onClick={() => { closeMenu(); run('superscript'); }} />
                  <MenuItem label="Subscript" onClick={() => { closeMenu(); run('subscript'); }} />
                  <MenuItem label="Clear formatting" onClick={() => { closeMenu(); run('removeFormat'); }} />
                  <MenuItem label="Drop cap" onClick={() => { closeMenu(); toggleDropCap(); }} />
                  <MenuItem label="Paragraph" onClick={() => { closeMenu(); run('formatBlock', 'p'); }} />
                  <MenuItem label="Heading 1" onClick={() => { closeMenu(); run('formatBlock', 'h1'); }} />
                  <MenuItem label="Heading 2" onClick={() => { closeMenu(); run('formatBlock', 'h2'); }} />
                  <MenuItem label="Heading 3" onClick={() => { closeMenu(); run('formatBlock', 'h3'); }} />
                </>
              ) : null}
              {item === 'Tools' ? (
                <>
                  <MenuItem label={`Word count: ${wordCount}`} onClick={closeMenu} />
                  <MenuItem label="Find and replace" onClick={() => { closeMenu(); findReplace(); }} />
                </>
              ) : null}
              {item === 'Table' ? <MenuItem label="Insert table" onClick={() => { closeMenu(); addTable(); }} /> : null}
              {item === 'Help' ? (
                <p className="max-w-[240px] px-3 py-2 text-xs leading-5 text-[#4b5563] dark:text-gray-300">
                  Use the toolbar for styles, lists, images, columns, drop caps, and page breaks. Press Escape to leave fullscreen. Click the left edge of a checklist item to tick it.
                </p>
              ) : null}
            </MenuPanel>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center gap-0.5 border-b border-[#e3e3e3] bg-[#fff] px-1 py-1 dark:border-white/10 dark:bg-[#1e293b]">
        <ToolbarButton title="Undo" onClick={() => run('undo')}><Undo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => run('redo')}><Redo2 className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Fullscreen" active={fullscreen} onClick={() => setFullscreen((open) => !open)}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Print" onClick={printEditor}><Printer className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Format painter" active={painterOn} onClick={copyFormat}><Paintbrush className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <select
          defaultValue="p"
          onChange={(event) => run('formatBlock', event.target.value)}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Blocks"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="blockquote">Blockquote</option>
          <option value="pre">Code</option>
        </select>
        <select
          value={font}
          onChange={(event) => {
            setFont(event.target.value);
            const family = FONTS.find((item) => item[0] === event.target.value)?.[0] || event.target.value;
            run('fontName', family);
          }}
          className="h-7 max-w-[140px] rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Font family"
        >
          {FONTS.map((item) => (
            <option key={item[0]} value={item[0]}>{item[0]}</option>
          ))}
        </select>
        <select
          value={size}
          onChange={(event) => applyFontSize(event.target.value)}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Font size"
        >
          {SIZES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="flex w-full flex-wrap items-center gap-0.5 border-b border-[#e3e3e3] bg-white px-1 py-1 dark:border-white/10 dark:bg-[#1e293b]">
        <ToolbarButton title="Bold" onClick={() => run('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => run('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => run('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Strikethrough" onClick={() => run('strikeThrough')}><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <label className="relative flex h-7 items-center" title="Text color">
          <span className="px-1 text-xs font-bold">A</span>
          <input type="color" className="h-5 w-6 cursor-pointer border-0 bg-transparent" defaultValue="#111827" onChange={(event) => run('foreColor', event.target.value)} />
        </label>
        <label className="relative flex h-7 items-center" title="Background color">
          <span className="px-1 text-xs">Bg</span>
          <input type="color" className="h-5 w-6 cursor-pointer border-0 bg-transparent" defaultValue="#ffff00" onChange={(event) => run('hiliteColor', event.target.value)} />
        </label>
        <ToolbarButton title="Highlight" onClick={() => run('hiliteColor', '#ffff00')}><Highlighter className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Clear formatting" onClick={() => run('removeFormat')}><Pilcrow className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Superscript" onClick={() => run('superscript')}><Superscript className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Subscript" onClick={() => run('subscript')}><Subscript className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Drop cap" onClick={toggleDropCap}><span className="font-serif text-sm font-black">A</span></ToolbarButton>
        <select
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) applyLetterSpacing(event.target.value);
            event.target.value = '';
          }}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Character spacing"
        >
          <option value="">Spacing</option>
          {SPACING.map((item) => (
            <option key={item[1]} value={item[1]}>{item[0]}</option>
          ))}
        </select>
      </div>

      <div className="flex w-full flex-wrap items-center gap-0.5 border-b border-[#e3e3e3] bg-white px-1 py-1 dark:border-white/10 dark:bg-[#1e293b]">
        <ToolbarButton title="Align left" onClick={() => run('justifyLeft')}><AlignLeft className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Align center" onClick={() => run('justifyCenter')}><AlignCenter className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Align right" onClick={() => run('justifyRight')}><AlignRight className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Justify" onClick={() => run('justifyFull')}><AlignJustify className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <select
          value={lineHeight}
          onChange={(event) => applyLineHeight(event.target.value)}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Line height"
        >
          {LINE_HEIGHTS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <ToolbarButton title="Decrease indent" onClick={() => run('outdent')}><IndentDecrease className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Increase indent" onClick={() => run('indent')}><IndentIncrease className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Bullet list" onClick={() => run('insertUnorderedList')}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => run('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Checklist" onClick={insertChecklist}><ListChecks className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <select
          defaultValue=""
          onChange={(event) => {
            const next = event.target.value;
            event.target.value = '';
            if (next === '1' || next === '2' || next === '3') setColumns(Number(next) as 1 | 2 | 3);
          }}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Column layout"
        >
          <option value="">Columns</option>
          <option value="1">Single column</option>
          <option value="2">Two columns</option>
          <option value="3">Three columns</option>
        </select>
      </div>

      <div className="flex w-full flex-wrap items-center gap-0.5 border-b border-[#e3e3e3] bg-white px-1 py-1 dark:border-white/10 dark:bg-[#1e293b]">
        <ToolbarButton title="Link" onClick={addLink}><Link2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Image" onClick={addImage}><ImageIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Video" onClick={addVideo}><Video className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Table" onClick={addTable}><Table className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Code sample" onClick={() => insertHtml('<pre><code>code</code></pre>')}><Code className="h-4 w-4" /></ToolbarButton>
        <select
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) insertHtml(event.target.value);
            event.target.value = '';
          }}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Emoji"
        >
          <option value="">Emoji</option>
          {EMOJIS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) insertHtml(event.target.value);
            event.target.value = '';
          }}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Special character"
        >
          <option value="">Char</option>
          {SPECIALS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <ToolbarButton title="Page break" onClick={insertPageBreak}><Minus className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Anchor" onClick={insertAnchor}><Anchor className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Table of contents" onClick={insertContents}><span className="text-[11px] font-semibold">TOC</span></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#ccc]" />
        <select
          value={zoom}
          onChange={(event) => setZoom(event.target.value)}
          className="h-7 rounded border border-[#ccc] bg-white px-1 text-xs dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-200"
          title="Zoom"
        >
          {ZOOMS.map((item) => (
            <option key={item} value={item}>{item}%</option>
          ))}
        </select>
        <span className="px-2 text-xs text-[#4b5563] dark:text-gray-300" title="Word count">{wordCount} words</span>
      </div>
      {imageSelected ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#e3e3e3] bg-[#f8fafc] px-2 py-1 text-xs dark:border-white/10 dark:bg-[#0f172a]">
          <span className="pr-1 text-[#4b5563] dark:text-gray-300">Image</span>
          <ToolbarButton title="Inline with text" onClick={() => layoutImage('inline')}>Inline</ToolbarButton>
          <ToolbarButton title="Wrap left" onClick={() => layoutImage('left')}>Left</ToolbarButton>
          <ToolbarButton title="Wrap left, top aligned" onClick={() => layoutImage('topleft')}>Left top</ToolbarButton>
          <ToolbarButton title="Wrap right" onClick={() => layoutImage('right')}>Right</ToolbarButton>
          <ToolbarButton title="Wrap right, top aligned" onClick={() => layoutImage('topright')}>Right top</ToolbarButton>
          <ToolbarButton title="Center, no wrap" onClick={() => layoutImage('center')}>Center</ToolbarButton>
          <ToolbarButton title="Rotate left" onClick={() => transformImage('left')}>↺</ToolbarButton>
          <ToolbarButton title="Rotate right" onClick={() => transformImage('right')}>↻</ToolbarButton>
          <ToolbarButton title="Flip vertical" onClick={() => transformImage('flipv')}>Flip V</ToolbarButton>
          <ToolbarButton title="Flip horizontal" onClick={() => transformImage('fliph')}>Flip H</ToolbarButton>
        </div>
      ) : null}
      {mediaStatus ? (
        <p className="border-b border-[#e5e7eb] bg-[#f0fdf4] px-3 py-1 text-xs text-[#166534] dark:border-white/10 dark:bg-emerald-500/10 dark:text-emerald-400">
          {mediaStatus}
        </p>
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
        onMouseUp={() => applyPainter()}
        className={`description-box w-full resize-y overflow-auto bg-white px-3 py-3 text-[15px] leading-[1.6] text-[#111827] outline-none empty:before:text-[#9ca3af] empty:before:content-[attr(data-placeholder)] dark:bg-[#1e293b] dark:text-gray-100 dark:empty:before:text-gray-500 [&_img[data-eton-media]]:ring-2 [&_img[data-eton-media]]:ring-[#00A651] [&_video[data-eton-media]]:ring-2 [&_video[data-eton-media]]:ring-[#00A651] ${
          onFaqsChange ? 'description-box--with-faq' : ''
        } ${fullscreen ? 'min-h-0 flex-1' : ''}`}
        style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif', fontSize: '11pt', lineHeight: 1.6, textAlign: 'justify', zoom: Number(zoom) / 100 }}
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
        <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#fafafa] px-4 py-2 text-xs text-[#6b7280] dark:border-white/10 dark:bg-[#0f172a] dark:text-gray-400">
          <span>Word Count: {wordCount}</span>
          <span>Pasted formatting is kept unless you change it with the toolbar</span>
        </div>
      )}
    </div>
  );
}
