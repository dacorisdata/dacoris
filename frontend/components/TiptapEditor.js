'use client';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Mention from '@tiptap/extension-mention';
import { Mark, mergeAttributes } from '@tiptap/core';
import { Box, IconButton, Divider, Typography, useTheme, Paper, List, ListItem, Avatar, Tooltip } from '@mui/material';
import {
  FormatBold, FormatItalic, FormatListBulleted, FormatListNumbered,
  FormatQuote, Code, Undo, Redo, CommentBank as CommentIcon
} from '@mui/icons-material';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import tippy from 'tippy.js';

// ─── Comment Mark ──────────────────────────────────────────────
const CommentMark = Mark.create({
  name: 'comment',
  addAttributes() {
    return {
      commentId: { default: null },
      resolved: { default: false },
    };
  },
  parseHTML() { return [{ tag: 'span[data-comment-id]' }]; },
  renderHTML({ HTMLAttributes }) {
    const resolved = HTMLAttributes['data-resolved'] === 'true' || HTMLAttributes.resolved;
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-comment-id': HTMLAttributes.commentId,
      style: `background: ${resolved ? 'transparent' : 'rgba(255,200,50,0.35)'}; border-bottom: 2px solid ${resolved ? 'transparent' : '#f59e0b'}; cursor: pointer;`,
    }), 0];
  },
});

// ─── Mention Suggestion List ────────────────────────────────────
const MentionList = forwardRef(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);
  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === 'ArrowUp') { setSelected(s => Math.max(0, s - 1)); return true; }
      if (event.key === 'ArrowDown') { setSelected(s => Math.min(items.length - 1, s + 1)); return true; }
      if (event.key === 'Enter') { command(items[selected]); return true; }
      return false;
    },
  }));
  if (!items.length) return null;
  return (
    <Paper elevation={4} sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 180, maxWidth: 280 }}>
      <List dense disablePadding>
        {items.map((item, i) => (
          <ListItem
            key={item.id}
            button
            selected={i === selected}
            onClick={() => command(item)}
            sx={{ gap: 1, px: 1.5, py: 0.75 }}
          >
            <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: item.color || '#16a699' }}>
              {item.label.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{item.role}</Typography>
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
});
MentionList.displayName = 'MentionList';

// ─── Main Editor ───────────────────────────────────────────────
export default function TiptapEditor({
  content, onChange, placeholder, disabled, onWordCount,
  collaborators = [],   // [{ id, label, role, color }]
  comments = [],        // [{ id, text, author, resolved, commentId }]
  onAddComment,         // (commentId, selectedText) => void
  onResolveComment,     // (commentId) => void
  currentUser,
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const editorRef = useRef(null);
  const [floatingBtn, setFloatingBtn] = useState({ visible: false, x: 0, y: 0 });
  const [pendingCommentId, setPendingCommentId] = useState(null);

  const buildSuggestion = () => ({
    items: ({ query }) => {
      const all = [
        ...(currentUser ? [{ id: 'me', label: currentUser.name || 'Me', role: 'Lead PI', color: '#16a699' }] : []),
        ...collaborators.map(c => ({ id: String(c.id || c.user?.id), label: c.user?.name || c.invited_name || 'Pending', role: c.role || 'Co-Investigator', color: '#8b5cf6' })),
      ];
      return all.filter(p => p.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
    },
    render: () => {
      let component;
      let popup;
      return {
        onStart(props) {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          if (!props.clientRect) return;
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },
        onUpdate(props) {
          component?.updateProps(props);
          if (props.clientRect) popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown(props) { return component?.ref?.onKeyDown(props); },
        onExit() { popup?.[0]?.destroy(); component?.destroy(); },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Start writing... Type @ to mention someone' }),
      CharacterCount,
      CommentMark,
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: buildSuggestion(),
        renderLabel: ({ node }) => `@${node.attrs.label}`,
      }),
    ],
    content: content || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
      onWordCount?.(editor.storage.characterCount.words());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (disabled || from === to) { setFloatingBtn({ visible: false, x: 0, y: 0 }); return; }
      // Position floating comment button near selection
      try {
        const view = editor.view;
        const start = view.coordsAtPos(from);
        const editorRect = view.dom.getBoundingClientRect();
        setFloatingBtn({ visible: true, x: start.left - editorRect.left, y: start.top - editorRect.top - 40 });
      } catch { setFloatingBtn({ visible: false, x: 0, y: 0 }); }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content || '');
  }, [content, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const toolbarBtn = (active, onClick, children, tip, dis = false) => (
    <Tooltip title={tip} placement="top">
      <span>
        <IconButton size="small" onClick={onClick} disabled={dis || disabled}
          sx={{ bgcolor: active ? '#16a699' : 'transparent', color: active ? 'white' : 'text.primary',
            '&:hover': { bgcolor: active ? '#14958a' : 'action.hover' }, borderRadius: 1 }}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );

  const addInlineComment = () => {
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const cid = `c-${Date.now()}`;
    editor.chain().focus().setMark('comment', { commentId: cid }).run();
    setFloatingBtn({ visible: false, x: 0, y: 0 });
    onAddComment?.(cid, editor.state.doc.textBetween(from, to));
    onChange?.(editor.getHTML());
  };

  const wordCount = editor.storage.characterCount.words();
  const charCount = editor.storage.characterCount.characters();
  const unresolvedComments = comments.filter(c => !c.resolved).length;

  return (
    <Box ref={editorRef} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 0.5, p: 1, bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.palette.divider}`, flexWrap: 'wrap', alignItems: 'center' }}>
        {toolbarBtn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <FormatBold fontSize="small" />, 'Bold', !editor.can().chain().focus().toggleBold().run())}
        {toolbarBtn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <FormatItalic fontSize="small" />, 'Italic', !editor.can().chain().focus().toggleItalic().run())}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {toolbarBtn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <FormatListBulleted fontSize="small" />, 'Bullet list')}
        {toolbarBtn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <FormatListNumbered fontSize="small" />, 'Numbered list')}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {toolbarBtn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), <FormatQuote fontSize="small" />, 'Quote')}
        {toolbarBtn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), <Code fontSize="small" />, 'Code')}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {toolbarBtn(false, () => editor.chain().focus().undo().run(), <Undo fontSize="small" />, 'Undo', !editor.can().chain().focus().undo().run())}
        {toolbarBtn(false, () => editor.chain().focus().redo().run(), <Redo fontSize="small" />, 'Redo', !editor.can().chain().focus().redo().run())}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tooltip title="Add comment on selected text">
          <span>
            <IconButton size="small" onClick={addInlineComment} disabled={disabled}
              sx={{ color: unresolvedComments > 0 ? '#f59e0b' : 'text.secondary', position: 'relative' }}>
              <CommentIcon fontSize="small" />
              {unresolvedComments > 0 && (
                <Box sx={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%', bgcolor: '#f59e0b', color: 'white', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {unresolvedComments}
                </Box>
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: 'text.secondary', px: 1 }}>
          {wordCount} words · {charCount} chars
        </Typography>
      </Box>

      {/* Editor + floating comment button */}
      <Box sx={{ position: 'relative' }}>
        {/* Floating "Add Comment" button on text selection */}
        {floatingBtn.visible && !disabled && (
          <Box
            onClick={addInlineComment}
            sx={{
              position: 'absolute', top: floatingBtn.y, left: floatingBtn.x,
              zIndex: 100, bgcolor: '#f59e0b', color: 'white',
              fontSize: 11, fontWeight: 700, px: 1.2, py: 0.4,
              borderRadius: 1.5, cursor: 'pointer', boxShadow: 3,
              display: 'flex', alignItems: 'center', gap: 0.5,
              '&:hover': { bgcolor: '#d97706' },
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <CommentIcon sx={{ fontSize: 13 }} /> Comment
          </Box>
        )}

        <Box sx={{
          '& .ProseMirror': {
            minHeight: 400, maxHeight: 600, overflowY: 'auto', p: 3,
            outline: 'none', fontSize: 15, lineHeight: 1.7,
            fontFamily: theme.typography.fontFamily, color: theme.palette.text.primary,
            '& p.is-editor-empty:first-of-type::before': { content: 'attr(data-placeholder)', float: 'left', color: theme.palette.text.disabled, pointerEvents: 'none', height: 0 },
            '& p': { marginBottom: '1em' },
            '& h1, & h2, & h3': { fontWeight: 700, marginTop: '1.5em', marginBottom: '0.5em' },
            '& ul, & ol': { paddingLeft: '1.5em', marginBottom: '1em' },
            '& blockquote': { borderLeft: `3px solid #16a699`, paddingLeft: '1em', marginLeft: 0, fontStyle: 'italic', color: theme.palette.text.secondary },
            '& code': { background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: '0.2em 0.4em', borderRadius: '3px', fontSize: '0.9em', fontFamily: 'monospace' },
            '& pre': { background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: '1em', borderRadius: '6px', overflow: 'auto', '& code': { background: 'transparent', padding: 0 } },
            '& .mention': { color: '#16a699', fontWeight: 600, background: 'rgba(22,166,153,0.1)', borderRadius: '4px', padding: '0 4px' },
          },
        }}>
          <EditorContent editor={editor} />
        </Box>
      </Box>
    </Box>
  );
}
