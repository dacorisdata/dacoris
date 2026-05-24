'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Box, IconButton, Divider, Typography, useTheme, FormControl, FormHelperText, Tooltip,
} from '@mui/material';
import {
  FormatBold, FormatItalic, FormatUnderlined, FormatListBulleted, FormatListNumbered,
  FormatQuote, Undo, Redo,
} from '@mui/icons-material';
import { useEffect } from 'react';
import { accentScrollbarSx } from '../lib/scrollStyles';

function toEditorHtml(value) {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('<')) return value;
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<p>${escaped.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
}

function normalizeHtml(html) {
  if (!html || html === '<p></p>') return '';
  return html;
}

export default function RichTextField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  required,
  disabled,
  minRows = 4,
  showWordCount = false,
  sx,
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const minHeight = minRows * 24 + 32;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
      CharacterCount,
    ],
    content: toEditorHtml(value),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange?.(normalizeHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(value);
    const current = editor.getHTML();
    if (normalizeHtml(next) !== normalizeHtml(current)) {
      editor.commands.setContent(next || '');
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const toolbarBtn = (active, onClick, children, tip, dis = false) => (
    <Tooltip title={tip} placement="top">
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={dis || disabled}
          sx={{
            bgcolor: active ? '#1ca7a1' : 'transparent',
            color: active ? 'white' : 'text.primary',
            '&:hover': { bgcolor: active ? '#0e8a85' : 'action.hover' },
            borderRadius: 1,
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );

  const wordCount = editor.storage.characterCount.words();

  return (
    <FormControl fullWidth sx={{ mb: 2.5, ...sx }}>
      {label && (
        <Typography
          component="label"
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: 'text.secondary',
            mb: 0.75,
            display: 'block',
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>
          )}
        </Typography>
      )}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
          '&:focus-within': {
            borderColor: '#1ca7a1',
            boxShadow: `0 0 0 1px #1ca7a1`,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            p: 0.75,
            flexWrap: 'wrap',
            alignItems: 'center',
            bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {toolbarBtn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <FormatBold fontSize="small" />, 'Bold', !editor.can().chain().focus().toggleBold().run())}
          {toolbarBtn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <FormatItalic fontSize="small" />, 'Italic', !editor.can().chain().focus().toggleItalic().run())}
          {toolbarBtn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <FormatUnderlined fontSize="small" />, 'Underline')}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          {toolbarBtn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <FormatListBulleted fontSize="small" />, 'Bullet list')}
          {toolbarBtn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <FormatListNumbered fontSize="small" />, 'Numbered list')}
          {toolbarBtn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), <FormatQuote fontSize="small" />, 'Quote')}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          {toolbarBtn(false, () => editor.chain().focus().undo().run(), <Undo fontSize="small" />, 'Undo', !editor.can().chain().focus().undo().run())}
          {toolbarBtn(false, () => editor.chain().focus().redo().run(), <Redo fontSize="small" />, 'Redo', !editor.can().chain().focus().redo().run())}
          {showWordCount && (
            <>
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary', px: 0.5 }}>
                {wordCount} words
              </Typography>
            </>
          )}
        </Box>
        <Box
          sx={{
            ...accentScrollbarSx(dark, { size: 8 }),
            '& .ProseMirror': {
              minHeight,
              p: 2,
              outline: 'none',
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: theme.typography.fontFamily,
              color: theme.palette.text.primary,
              '& p.is-editor-empty:first-of-type::before': {
                content: 'attr(data-placeholder)',
                float: 'left',
                color: theme.palette.text.disabled,
                pointerEvents: 'none',
                height: 0,
              },
              '& p': { marginBottom: '0.75em', '&:last-child': { marginBottom: 0 } },
              '& ul, & ol': { paddingLeft: '1.5em', marginBottom: '0.75em' },
              '& blockquote': {
                borderLeft: '3px solid #1ca7a1',
                paddingLeft: '1em',
                marginLeft: 0,
                fontStyle: 'italic',
                color: theme.palette.text.secondary,
              },
            },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
      {(helperText) && (
        <FormHelperText sx={{ mx: 0, mt: 0.75 }}>
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
}
