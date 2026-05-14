'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import './editor.css';
import {
  Box, Paper, IconButton, Typography, Avatar, AvatarGroup, Tooltip, Button,
  Divider, ToggleButtonGroup, ToggleButton, Menu, MenuItem, useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  FormatQuote as QuoteIcon,
  Code as CodeIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  FormatAlignJustify as AlignJustifyIcon,
  Title as H1Icon,
  Subject as H2Icon,
  Notes as H3Icon,
  Highlight as HighlightIcon,
  HorizontalRule as DividerIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

export default function ManuscriptEditorPage() {
  const router = useRouter();
  const params = useParams();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  
  const [manuscript, setManuscript] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([
    { id: 1, name: 'John Doe', avatar: 'JD', color: '#1ca7a1' },
    { id: 2, name: 'Jane Smith', avatar: 'JS', color: '#3b82f6' },
  ]);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: '<h1>Start writing your manuscript...</h1><p>Begin typing here.</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  useEffect(() => {
    fetchManuscript();
  }, [params.id]);

  const fetchManuscript = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setManuscript(data);
        if (data.content && editor) {
          editor.commands.setContent(data.content);
        }
      }
    } catch (error) {
      console.error('Error fetching manuscript:', error);
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const content = editor.getHTML();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving manuscript:', error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (editor && !saving) {
        handleSave();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [editor, saving]);

  if (!editor) return null;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top Bar */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <IconButton onClick={() => router.push('/researcher/manuscripts')} size="small">
          <BackIcon />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            {manuscript?.title || 'Untitled Manuscript'}
          </Typography>
          {lastSaved && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Last saved {lastSaved.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        <AvatarGroup max={4} sx={{ mr: 2 }}>
          {onlineUsers.map((user) => (
            <Tooltip key={user.id} title={user.name}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: user.color,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {user.avatar}
              </Avatar>
            </Tooltip>
          ))}
        </AvatarGroup>

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            textTransform: 'none',
            bgcolor: ACCENT,
            '&:hover': { bgcolor: '#0e7490' },
            borderRadius: 2,
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>

        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <MoreIcon />
        </IconButton>
      </Paper>

      {/* Menu Bar */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* Undo/Redo */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <UndoIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <RedoIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Headings */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            sx={{ 
              bgcolor: editor.isActive('heading', { level: 1 }) ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('heading', { level: 1 }) ? ACCENT : 'inherit',
            }}
          >
            <H1Icon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            sx={{ 
              bgcolor: editor.isActive('heading', { level: 2 }) ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('heading', { level: 2 }) ? ACCENT : 'inherit',
            }}
          >
            <H2Icon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            sx={{ 
              bgcolor: editor.isActive('heading', { level: 3 }) ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('heading', { level: 3 }) ? ACCENT : 'inherit',
            }}
          >
            <H3Icon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Text Formatting */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            sx={{ 
              bgcolor: editor.isActive('bold') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('bold') ? ACCENT : 'inherit',
            }}
          >
            <BoldIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            sx={{ 
              bgcolor: editor.isActive('italic') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('italic') ? ACCENT : 'inherit',
            }}
          >
            <ItalicIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            sx={{ 
              bgcolor: editor.isActive('underline') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('underline') ? ACCENT : 'inherit',
            }}
          >
            <UnderlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            sx={{ 
              bgcolor: editor.isActive('highlight') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('highlight') ? ACCENT : 'inherit',
            }}
          >
            <HighlightIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Lists */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            sx={{ 
              bgcolor: editor.isActive('bulletList') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('bulletList') ? ACCENT : 'inherit',
            }}
          >
            <BulletListIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            sx={{ 
              bgcolor: editor.isActive('orderedList') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('orderedList') ? ACCENT : 'inherit',
            }}
          >
            <NumberedListIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Alignment */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            sx={{ 
              bgcolor: editor.isActive({ textAlign: 'left' }) ? `${ACCENT}20` : 'transparent',
              color: editor.isActive({ textAlign: 'left' }) ? ACCENT : 'inherit',
            }}
          >
            <AlignLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            sx={{ 
              bgcolor: editor.isActive({ textAlign: 'center' }) ? `${ACCENT}20` : 'transparent',
              color: editor.isActive({ textAlign: 'center' }) ? ACCENT : 'inherit',
            }}
          >
            <AlignCenterIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            sx={{ 
              bgcolor: editor.isActive({ textAlign: 'right' }) ? `${ACCENT}20` : 'transparent',
              color: editor.isActive({ textAlign: 'right' }) ? ACCENT : 'inherit',
            }}
          >
            <AlignRightIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            sx={{ 
              bgcolor: editor.isActive({ textAlign: 'justify' }) ? `${ACCENT}20` : 'transparent',
              color: editor.isActive({ textAlign: 'justify' }) ? ACCENT : 'inherit',
            }}
          >
            <AlignJustifyIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Other */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            sx={{ 
              bgcolor: editor.isActive('blockquote') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('blockquote') ? ACCENT : 'inherit',
            }}
          >
            <QuoteIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            sx={{ 
              bgcolor: editor.isActive('codeBlock') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('codeBlock') ? ACCENT : 'inherit',
            }}
          >
            <CodeIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <DividerIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Paper>

      {/* Editor Content */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          bgcolor: dark ? 'background.paper' : '#f9fafb',
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 850,
            mx: 'auto',
            p: 6,
            minHeight: '100%',
            borderRadius: 0,
            boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <EditorContent 
            editor={editor} 
            style={{
              minHeight: '500px',
              fontSize: '16px',
              lineHeight: '1.75',
            }}
          />
        </Paper>
      </Box>

      {/* Options Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => { /* TODO: Export as PDF */ setMenuAnchor(null); }}>
          Export as PDF
        </MenuItem>
        <MenuItem onClick={() => { /* TODO: Export as Word */ setMenuAnchor(null); }}>
          Export as Word
        </MenuItem>
        <MenuItem onClick={() => { /* TODO: Version History */ setMenuAnchor(null); }}>
          Version History
        </MenuItem>
        <MenuItem onClick={() => { /* TODO: Share */ setMenuAnchor(null); }}>
          Share & Collaborate
        </MenuItem>
      </Menu>
    </Box>
  );
}
