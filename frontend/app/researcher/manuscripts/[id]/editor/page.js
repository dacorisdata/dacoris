'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import FontSize from 'tiptap-extension-font-size';
import TextStyle from '@tiptap/extension-text-style';
import Mathematics from '@tiptap/extension-mathematics';
import Citation from '@/lib/tiptap-citation-extension';
import Comment from '@/lib/tiptap-comment-extension';
import PageBreak from '@/lib/tiptap-pagebreak-extension';
import 'katex/dist/katex.min.css';
import CitationSidebar from '@/components/CitationSidebar';
import BibliographyManager from '@/components/BibliographyManager';
import CommentSidebar from '@/components/CommentSidebar';
import CommentForm from '@/components/CommentForm';
import PagedEditor from '@/components/PagedEditor';
import DocumentOutline from '@/components/DocumentOutline';
import CitationSuggestion from '@/components/CitationSuggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/lib/page-config';
import './editor.css';
import {
  Box, Paper, IconButton, Typography, Avatar, AvatarGroup, Tooltip, Button,
  Divider, ToggleButtonGroup, ToggleButton, Menu, MenuItem, useTheme,
  Select, FormControl, Snackbar, Alert, MenuList, ListItemIcon, ListItemText,
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
  FormatQuote as CitationIcon,
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
  Comment as CommentIcon,
  AddComment as AddCommentIcon,
  Edit as RenameIcon,
  ContentCut as CutIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Image as ImageIcon,
  TableChart as TableIcon,
  Link as LinkIcon,
  History as VersionIcon,
  KeyboardArrowDown as ArrowDownIcon,
  InsertPageBreak as PageBreakIcon,
  Description as PageSizeIcon,
  FormatClear as ParagraphIcon,
  Functions as MathIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function ManuscriptEditorPage() {
  const router = useRouter();
  const params = useParams();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  
  const [manuscript, setManuscript] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  
  // Menu bar anchors
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [editMenuAnchor, setEditMenuAnchor] = useState(null);
  const [insertMenuAnchor, setInsertMenuAnchor] = useState(null);
  const [formatMenuAnchor, setFormatMenuAnchor] = useState(null);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState(null);
  
  const [citationSidebarOpen, setCitationSidebarOpen] = useState(false);
  const [citationStyle, setCitationStyle] = useState('APA');
  const [citations, setCitations] = useState([]);
  const [publications, setPublications] = useState([]);
  const publicationsRef = useRef([]);
  const editorRef = useRef(null);
  
  // Comment state
  const [comments, setComments] = useState([]);
  const [commentFilter, setCommentFilter] = useState('all');
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentFormPosition, setCommentFormPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [collaborators, setCollaborators] = useState([]); // For @mentions
  
  // Page settings
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageCount, setPageCount] = useState(1);
  
  // Document outline
  const [outlineOpen, setOutlineOpen] = useState(true);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Handle comment deletion when text is deleted
  const handleCommentDeletedFromText = useCallback(async (commentId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }, [params.id]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Mathematics,
      Citation.configure({
        suggestion: {
          char: '@',
          allowSpaces: true,
          startOfLine: false,
          items: ({ query }) => {
            // Filter publications by query using ref to get latest data
            const lowerQuery = query.toLowerCase();
            const currentPublications = publicationsRef.current || [];
            console.log('🔍 Filtering publications:', currentPublications.length, 'total, query:', query);
            
            const filtered = currentPublications
              .filter(pub => {
                const authors = (pub.authors || '').toLowerCase();
                const title = (pub.title || '').toLowerCase();
                return authors.includes(lowerQuery) || title.includes(lowerQuery);
              })
              .slice(0, 10);
            
            console.log('✅ Filtered results:', filtered.length, 'items');
            return filtered;
          },
          render: () => {
            let component;
            let popup;

            return {
              onStart: props => {
                component = new ReactRenderer(CitationSuggestion, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

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
                component.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }

                return component.ref?.onKeyDown(props);
              },

              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
          command: ({ editor, range, props }) => {
            // Delete the trigger character and query text
            editor.chain().focus().deleteRange(range).run();
            // Insert citation - pass the editor from the command context
            handleInsertCitationFromSuggestion(props, editor);
          },
        },
      }),
      Comment.configure({
        onCommentDeleted: handleCommentDeletedFromText,
        onCommentClick: (commentId) => {
          // Open sidebar and scroll to comment
          setCommentSidebarOpen(true);
          // Small delay to ensure sidebar is rendered
          setTimeout(() => {
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        },
      }),
      PageBreak,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  useEffect(() => {
    fetchManuscript();
    fetchCitations();
    fetchComments();
    fetchCurrentUser();
    fetchPublications();
    
    // Load page size preference
    const savedPageSize = localStorage.getItem('manuscript-page-size');
    if (savedPageSize && PAGE_SIZE_OPTIONS.find(opt => opt.value === savedPageSize)) {
      setPageSize(savedPageSize);
    }
    
    // Load outline preference
    const savedOutlineOpen = localStorage.getItem('manuscript-outline-open');
    if (savedOutlineOpen !== null) {
      setOutlineOpen(savedOutlineOpen === 'true');
    }
  }, [params.id]);

  // Set editor content when both editor and manuscript are ready
  useEffect(() => {
    if (editor && manuscript && manuscript.content) {
      console.log('📝 Setting editor content from manuscript:', manuscript.content.length, 'characters');
      editor.commands.setContent(manuscript.content);
    }
  }, [editor, manuscript]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}/comments`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async (content) => {
    if (!selectedText) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
            quoted_text: selectedText.text,
            selection_start: selectedText.from,
            selection_end: selectedText.to,
          }),
        }
      );

      if (response.ok) {
        const newComment = await response.json();
        setComments([...comments, newComment]);
        
        // Add comment mark to editor with comment text for tooltip
        if (editor) {
          const commentPreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
          editor.chain()
            .focus()
            .setTextSelection({ from: selectedText.from, to: selectedText.to })
            .setComment(newComment.id, commentPreview)
            .run();
        }
        
        setShowCommentForm(false);
        setSelectedText(null);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleReplyComment = async (parentCommentId, content) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
            parent_comment_id: parentCommentId,
          }),
        }
      );

      if (response.ok) {
        const newComment = await response.json();
        setComments([...comments, newComment]);
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
    }
  };

  const handleResolveComment = async (commentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}/comments/${commentId}/resolve`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setComments(comments.map(c => 
          c.id === commentId ? { ...c, is_resolved: result.is_resolved } : c
        ));
        
        // Update comment mark in editor
        if (editor) {
          editor.commands.updateCommentResolved(commentId, result.is_resolved);
        }
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        
        // Remove comment mark from editor
        if (editor) {
          editor.commands.removeCommentMark(commentId);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleTextSelection = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      setSelectedText(null);
      return;
    }

    const text = editor.state.doc.textBetween(from, to, ' ');
    if (text.trim()) {
      setSelectedText({ from, to, text });
    }
  }, [editor]);

  const handleShowCommentForm = () => {
    if (!selectedText) return;

    // Position the comment form near the selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setCommentFormPosition({
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX,
      });
    }

    setShowCommentForm(true);
  };

  // Track text selection
  useEffect(() => {
    if (!editor) return;

    editor.on('selectionUpdate', handleTextSelection);
    return () => {
      editor.off('selectionUpdate', handleTextSelection);
    };
  }, [editor, handleTextSelection]);

  const fetchManuscript = async () => {
    try {
      console.log('📖 Fetching manuscript:', params.id);
      const token = localStorage.getItem('token');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('📡 Fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Manuscript loaded:', {
          id: data.id,
          title: data.title,
          hasContent: !!data.content,
          contentLength: data.content?.length || 0
        });
        
        setManuscript(data);
        
        // Build collaborators list for mentions
        const collabList = [];
        if (data.user && (data.user.name || data.user.email)) {
          collabList.push({ 
            id: data.user.id, 
            name: data.user.name || data.user.email, 
            email: data.user.email || '' 
          });
        }
        if (data.co_authors && Array.isArray(data.co_authors)) {
          data.co_authors.forEach(coAuthor => {
            if (coAuthor.id !== data.user?.id && (coAuthor.name || coAuthor.email)) {
              collabList.push({ 
                id: coAuthor.id, 
                name: coAuthor.name || coAuthor.email, 
                email: coAuthor.email || '' 
              });
            }
          });
        }
        setCollaborators(collabList);
      } else {
        console.error('❌ Failed to fetch manuscript:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching manuscript:', error);
    }
  };

  const handleSave = async () => {
    if (!editor) {
      console.error('❌ Editor not initialized');
      return;
    }
    
    console.log('💾 Saving manuscript...');
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const content = editor.getHTML();
      
      console.log('📝 Content length:', content.length, 'characters');
      console.log('🔑 Token exists:', !!token);
      
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}`;
      console.log('🌐 Saving to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Manuscript saved successfully:', data);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setSnackbar({ open: true, message: 'Manuscript saved successfully!', severity: 'success' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to save manuscript:', response.status, errorData);
        setSnackbar({ open: true, message: `Failed to save: ${errorData.detail || response.statusText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('❌ Error saving manuscript:', error);
      setSnackbar({ open: true, message: 'Failed to save manuscript. Please check your connection.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const fetchCitations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${params.id}/citations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCitations(data);
      }
    } catch (error) {
      console.error('Error fetching citations:', error);
    }
  };

  const fetchPublications = async () => {
    try {
      console.log('🔄 Fetching publications...');
      const token = localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${apiBase}/publications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('📡 Publications response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📚 Publications fetched:', data.length, 'items');
        console.log('📚 First publication:', data[0]);
        setPublications(data);
        publicationsRef.current = data; // Also update the ref for real-time access
        console.log('✅ Publications ref updated:', publicationsRef.current.length, 'items');
      } else {
        console.error('❌ Failed to fetch publications:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching publications:', error);
    }
  };

  const handleInsertCitationFromSuggestion = async (publication, editorInstance = null) => {
    console.log('🎯 handleInsertCitationFromSuggestion called');
    console.log('🎯 Publication:', publication);
    console.log('🎯 Editor from state:', !!editor);
    console.log('🎯 Editor from parameter:', !!editorInstance);
    
    // Use the editor passed as parameter, or fall back to state
    const activeEditor = editorInstance || editor;
    
    if (!activeEditor) {
      console.error('❌ Editor not available');
      setSnackbar({ open: true, message: 'Editor not ready. Please try again.', severity: 'error' });
      return;
    }
    
    console.log('✅ Using editor:', !!activeEditor);
    
    // Check if already cited
    const alreadyCited = citations.some(c => c.publication_id === publication.id);
    console.log('📋 Already cited:', alreadyCited);
    
    if (alreadyCited) {
      // Find existing citation and insert it
      const existingCitation = citations.find(c => c.publication_id === publication.id);
      if (existingCitation) {
        console.log('📌 Inserting existing citation');
        insertCitationInline(existingCitation, activeEditor);
      }
      return;
    }

    // Create new citation
    try {
      console.log('➕ Creating new citation for publication:', publication.id);
      const token = localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(
        `${apiBase}/manuscripts/${params.id}/citations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            publication_id: publication.id,
            citation_style: citationStyle,
          }),
        }
      );

      console.log('📡 Citation creation response:', response.status);

      if (response.ok) {
        const citation = await response.json();
        console.log('✅ Citation created:', citation);
        setCitations(prev => [...prev, citation]);
        insertCitationInline(citation, activeEditor);
      } else {
        const error = await response.json();
        console.error('❌ Citation creation failed:', error);
        
        if (error.detail && error.detail.includes('already exists')) {
          console.log('⚠️ Citation exists, fetching...');
          // Fetch and insert existing citation
          const citationsResponse = await fetch(
            `${apiBase}/manuscripts/${params.id}/citations`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (citationsResponse.ok) {
            const allCitations = await citationsResponse.json();
            const existingCitation = allCitations.find(c => c.publication_id === publication.id);
            if (existingCitation) {
              console.log('📌 Inserting existing citation from server');
              setCitations(allCitations);
              insertCitationInline(existingCitation, activeEditor);
            }
          }
        } else {
          setSnackbar({ open: true, message: error.detail || 'Failed to create citation', severity: 'error' });
        }
      }
    } catch (error) {
      console.error('❌ Error creating citation:', error);
      setSnackbar({ open: true, message: 'Network error creating citation', severity: 'error' });
    }
  };

  const insertCitationInline = (citation, editorInstance = null) => {
    const activeEditor = editorInstance || editor;
    
    if (!activeEditor) {
      console.error('❌ Editor not ready for citation insertion');
      return;
    }

    console.log('📝 Inserting citation inline:', citation);
    console.log('📝 Using editor:', !!activeEditor);
    console.log('📝 Citation data:', {
      id: citation.id,
      citation_key: citation.citation_key,
      publication_id: citation.publication_id,
      publication: citation.publication
    });
    
    const inlineText = formatInlineCitation(citation);
    console.log('📝 Formatted citation text:', inlineText);
    
    try {
      // Get current cursor position
      const { from, to } = activeEditor.state.selection;
      console.log('📍 Current cursor position:', { from, to });
      
      // Use the custom insertCitation command from the Citation extension
      const result = activeEditor
        .chain()
        .focus()
        .insertContent({
          type: 'citation',
          attrs: {
            citationId: citation.id,
            citationKey: citation.citation_key,
            publicationId: citation.publication_id,
            inlineText: inlineText,
          },
        })
        .run();
      
      console.log('📝 Insert result:', result);
      
      // Verify insertion
      setTimeout(() => {
        const newContent = activeEditor.getHTML();
        if (newContent.includes(citation.id)) {
          console.log('✅ Citation verified in content');
        } else {
          console.warn('⚠️ Citation not found in content after insertion');
          console.log('Current content:', newContent.substring(0, 500));
        }
      }, 100);
      
      setHasUnsavedChanges(true);
      console.log('✅ Citation insertion command executed');
    } catch (error) {
      console.error('❌ Error inserting citation:', error);
      console.error('Error stack:', error.stack);
    }
  };

  const handleInsertCitation = (citation) => {
    console.log('🎯 handleInsertCitation called with:', citation);
    console.log('🎯 Editor ready:', !!editor);
    
    if (!editor) {
      console.error('❌ Editor not initialized');
      setSnackbar({ open: true, message: 'Editor not ready. Please wait a moment.', severity: 'error' });
      return;
    }

    console.log('📝 Inserting citation:', citation);
    
    try {
      insertCitationInline(citation);

      // Update citations list if not already present
      setCitations((prev) => {
        const exists = prev.some(c => c.id === citation.id);
        console.log('📋 Citation already in list:', exists);
        if (exists) {
          return prev;
        }
        return [...prev, citation];
      });
      
      setSnackbar({ open: true, message: 'Citation inserted!', severity: 'success' });
      console.log('✅ Citation insertion completed');
    } catch (error) {
      console.error('❌ Error in handleInsertCitation:', error);
      setSnackbar({ open: true, message: 'Failed to insert citation', severity: 'error' });
    }
  };

  const formatInlineCitation = (citation) => {
    console.log('🔤 Formatting citation:', { citation, style: citationStyle });
    
    const pub = citation.publication;
    if (!pub) {
      console.warn('⚠️ No publication data in citation');
      return '[Citation]';
    }

    const style = citationStyle.toUpperCase();
    const authors = pub.authors || 'Unknown';
    const year = pub.year || 'n.d.';
    const lastName = authors.split(';')[0].split(',')[0].trim();
    
    console.log('🔤 Citation formatting:', { style, authors, year, lastName });

    let formatted;
    if (style === 'APA') {
      formatted = `(${lastName}, ${year})`;
    } else if (style === 'MLA') {
      formatted = `(${lastName})`;
    } else if (style === 'CHICAGO') {
      formatted = `[${citation.order}]`;
    } else if (style === 'HARVARD') {
      formatted = `(${lastName} ${year})`;
    } else {
      formatted = `[${citation.order}]`;
    }
    
    console.log('🔤 Formatted result:', formatted);
    return formatted;
  };

  // Track content changes
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      setHasUnsavedChanges(true);
    };
    
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, saving]);

  // Auto-save every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (editor && !saving && hasUnsavedChanges) {
        console.log('🔄 Auto-saving manuscript...');
        handleSave();
      }
    }, 300000); // 5 minutes = 300000ms
    return () => clearInterval(interval);
  }, [editor, saving, hasUnsavedChanges]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        // Attempt to save before leaving
        if (editor && !saving) {
          handleSave();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, editor, saving]);

  // Helper functions for dropdowns
  const getCurrentFontFamily = () => {
    if (!editor) return 'Default';
    const fontFamily = editor.getAttributes('textStyle').fontFamily;
    return fontFamily || 'Default';
  };

  const getCurrentFontSize = () => {
    if (!editor) return '16px';
    const fontSize = editor.getAttributes('textStyle').fontSize;
    return fontSize || '16px';
  };

  const getCurrentHeadingLevel = () => {
    if (!editor) return 'paragraph';
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) {
        return `h${level}`;
      }
    }
    return 'paragraph';
  };

  const handleFontFamilyChange = (event) => {
    const fontFamily = event.target.value;
    if (fontFamily === 'Default') {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(fontFamily).run();
    }
  };

  const handleFontSizeChange = (event) => {
    const fontSize = event.target.value;
    if (fontSize === 'Default') {
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setFontSize(fontSize).run();
    }
  };

  const handleHeadingChange = (event) => {
    const value = event.target.value;
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(value.replace('h', ''));
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const handlePageSizeChange = (event) => {
    const newSize = event.target.value;
    setPageSize(newSize);
    localStorage.setItem('manuscript-page-size', newSize);
  };

  const handleInsertPageBreak = () => {
    if (editor) {
      editor.chain().focus().setPageBreak().run();
      setInsertMenuAnchor(null);
    }
  };

  const handleInsertInlineMath = () => {
    if (editor) {
      const latex = prompt('Enter LaTeX formula (e.g., n = 50):');
      if (latex) {
        editor.chain().focus().setInlineMath(latex).run();
      }
      setInsertMenuAnchor(null);
    }
  };

  const handleInsertBlockMath = () => {
    if (editor) {
      const latex = prompt('Enter LaTeX formula (e.g., \\sum_{i=1}^{n} x_i):');
      if (latex) {
        editor.chain().focus().setBlockMath(latex).run();
      }
      setInsertMenuAnchor(null);
    }
  };

  const handleToggleOutline = () => {
    const newState = !outlineOpen;
    setOutlineOpen(newState);
    localStorage.setItem('manuscript-outline-open', newState.toString());
  };

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
            {hasUnsavedChanges && (
              <Typography component="span" sx={{ ml: 1, fontSize: 12, color: 'warning.main', fontWeight: 400 }}>
                • Unsaved changes
              </Typography>
            )}
            {pageCount > 1 && (
              <Typography component="span" sx={{ ml: 1, fontSize: 12, color: 'text.secondary', fontWeight: 400 }}>
                • {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              </Typography>
            )}
          </Typography>
          {lastSaved && !hasUnsavedChanges && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              ✓ Saved at {lastSaved.toLocaleTimeString()}
            </Typography>
          )}
          {hasUnsavedChanges && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Press Ctrl+S to save
            </Typography>
          )}
        </Box>

        {manuscript && (
          <AvatarGroup max={4} sx={{ mr: 2 }}>
            {/* Creator */}
            {manuscript.creator && (
              <Tooltip 
                arrow
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                      {manuscript.creator.name || manuscript.creator.email || 'Creator'}
                    </Typography>
                    {manuscript.creator.orcid_id && (
                      <Typography sx={{ fontSize: 10, opacity: 0.85, mt: 0.3 }}>
                        ORCID: {manuscript.creator.orcid_id}
                      </Typography>
                    )}
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.8, bgcolor: '#10b98125', borderRadius: 1, px: 0.8, py: 0.3 }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#10b981' }} />
                      <Typography sx={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>Creator</Typography>
                    </Box>
                  </Box>
                }
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: ACCENT,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {getInitials(manuscript.creator.name || manuscript.creator.email)}
                </Avatar>
              </Tooltip>
            )}
            
            {/* Co-authors */}
            {manuscript.co_authors?.map((ca) => (
              <Tooltip
                key={ca.id}
                arrow
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                      {ca.given_name} {ca.family_name}
                    </Typography>
                    {ca.orcid && (
                      <Typography sx={{ fontSize: 10, opacity: 0.85, mt: 0.3 }}>
                        ORCID: {ca.orcid}
                      </Typography>
                    )}
                    {ca.email && (
                      <Typography sx={{ fontSize: 10, opacity: 0.7, mt: 0.2 }}>{ca.email}</Typography>
                    )}
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.8,
                      bgcolor: ca.status === 'accepted' ? '#10b98125' : '#f59e0b25',
                      borderRadius: 1, px: 0.8, py: 0.3,
                    }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: ca.status === 'accepted' ? '#10b981' : '#f59e0b' }} />
                      <Typography sx={{ fontSize: 9, color: ca.status === 'accepted' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {ca.status === 'accepted' ? 'Active' : 'Pending'}
                      </Typography>
                    </Box>
                  </Box>
                }
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: ca.status === 'accepted' ? '#10b981' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {`${(ca.given_name[0] || '?')}${(ca.family_name[0] || '?')}`.toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        )}

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
          px: 1,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {/* File Menu */}
        <Button
          size="small"
          onClick={(e) => setFileMenuAnchor(e.currentTarget)}
          endIcon={<ArrowDownIcon sx={{ fontSize: 14 }} />}
          sx={{ textTransform: 'none', color: 'text.primary', fontSize: 13, minWidth: 'auto', px: 1 }}
        >
          File
        </Button>
        <Menu
          anchorEl={fileMenuAnchor}
          open={Boolean(fileMenuAnchor)}
          onClose={() => setFileMenuAnchor(null)}
          disableScrollLock
        >
          <MenuItem onClick={() => { /* TODO: Rename */ setFileMenuAnchor(null); }}>
            <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setFileMenuAnchor(null); }}>
            <ListItemIcon><SaveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Auto Save: {hasUnsavedChanges ? 'On' : 'Saved'}</ListItemText>
          </MenuItem>
        </Menu>

        {/* Edit Menu */}
        <Button
          size="small"
          onClick={(e) => setEditMenuAnchor(e.currentTarget)}
          endIcon={<ArrowDownIcon sx={{ fontSize: 14 }} />}
          sx={{ textTransform: 'none', color: 'text.primary', fontSize: 13, minWidth: 'auto', px: 1 }}
        >
          Edit
        </Button>
        <Menu
          anchorEl={editMenuAnchor}
          open={Boolean(editMenuAnchor)}
          onClose={() => setEditMenuAnchor(null)}
          disableScrollLock
        >
          <MenuItem 
            onClick={() => { editor?.chain().focus().undo().run(); setEditMenuAnchor(null); }}
            disabled={!editor?.can().undo()}
          >
            <ListItemIcon><UndoIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Undo</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+Z</Typography>
          </MenuItem>
          <MenuItem 
            onClick={() => { editor?.chain().focus().redo().run(); setEditMenuAnchor(null); }}
            disabled={!editor?.can().redo()}
          >
            <ListItemIcon><RedoIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Redo</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+Y</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { document.execCommand('cut'); setEditMenuAnchor(null); }}>
            <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Cut</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+X</Typography>
          </MenuItem>
          <MenuItem onClick={() => { document.execCommand('copy'); setEditMenuAnchor(null); }}>
            <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Copy</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+C</Typography>
          </MenuItem>
          <MenuItem onClick={() => { document.execCommand('paste'); setEditMenuAnchor(null); }}>
            <ListItemIcon><PasteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Paste</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+V</Typography>
          </MenuItem>
        </Menu>

        {/* Insert Menu */}
        <Button
          size="small"
          onClick={(e) => setInsertMenuAnchor(e.currentTarget)}
          endIcon={<ArrowDownIcon sx={{ fontSize: 14 }} />}
          sx={{ textTransform: 'none', color: 'text.primary', fontSize: 13, minWidth: 'auto', px: 1 }}
        >
          Insert
        </Button>
        <Menu
          anchorEl={insertMenuAnchor}
          open={Boolean(insertMenuAnchor)}
          onClose={() => setInsertMenuAnchor(null)}
          disableScrollLock
        >
          <MenuItem onClick={() => { /* TODO: Insert Image */ setInsertMenuAnchor(null); }}>
            <ListItemIcon><ImageIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Image</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { /* TODO: Insert Table */ setInsertMenuAnchor(null); }}>
            <ListItemIcon><TableIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Table</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { /* TODO: Insert Link */ setInsertMenuAnchor(null); }}>
            <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Link</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleInsertInlineMath}>
            <ListItemIcon><MathIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Inline Math</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>$...$</Typography>
          </MenuItem>
          <MenuItem onClick={handleInsertBlockMath}>
            <ListItemIcon><MathIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Block Math</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>$$...$$</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleInsertPageBreak}>
            <ListItemIcon><PageBreakIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Page Break</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+Enter</Typography>
          </MenuItem>
        </Menu>

        {/* Format Menu */}
        <Button
          size="small"
          onClick={(e) => setFormatMenuAnchor(e.currentTarget)}
          endIcon={<ArrowDownIcon sx={{ fontSize: 14 }} />}
          sx={{ textTransform: 'none', color: 'text.primary', fontSize: 13, minWidth: 'auto', px: 1 }}
        >
          Format
        </Button>
        <Menu
          anchorEl={formatMenuAnchor}
          open={Boolean(formatMenuAnchor)}
          onClose={() => setFormatMenuAnchor(null)}
          disableScrollLock
        >
          <MenuItem onClick={() => { editor?.chain().focus().setParagraph().run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><ParagraphIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Paragraph</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+Alt+0</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { editor?.chain().focus().setFontSize('12px').run(); setFormatMenuAnchor(null); }}>
            <ListItemText inset>Font Size: 12px</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setFontSize('14px').run(); setFormatMenuAnchor(null); }}>
            <ListItemText inset>Font Size: 14px</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setFontSize('16px').run(); setFormatMenuAnchor(null); }}>
            <ListItemText inset>Font Size: 16px (Default)</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setFontSize('18px').run(); setFormatMenuAnchor(null); }}>
            <ListItemText inset>Font Size: 18px</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setFontSize('24px').run(); setFormatMenuAnchor(null); }}>
            <ListItemText inset>Font Size: 24px</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setFontSize('36px').run(); setFormatMenuAnchor(null); }}>
            <ListItemText inset>Font Size: 36px</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { editor?.chain().focus().toggleBold().run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><BoldIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Bold</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+B</Typography>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().toggleItalic().run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><ItalicIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Italic</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+I</Typography>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().toggleUnderline().run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><UnderlineIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Underline</ListItemText>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Ctrl+U</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { editor?.chain().focus().setTextAlign('left').run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><AlignLeftIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Align Left</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setTextAlign('center').run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><AlignCenterIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Align Center</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setTextAlign('right').run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><AlignRightIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Align Right</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { editor?.chain().focus().setTextAlign('justify').run(); setFormatMenuAnchor(null); }}>
            <ListItemIcon><AlignJustifyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Align Justify</ListItemText>
          </MenuItem>
        </Menu>

        {/* Tools Menu */}
        <Button
          size="small"
          onClick={(e) => setToolsMenuAnchor(e.currentTarget)}
          endIcon={<ArrowDownIcon sx={{ fontSize: 14 }} />}
          sx={{ textTransform: 'none', color: 'text.primary', fontSize: 13, minWidth: 'auto', px: 1 }}
        >
          Tools
        </Button>
        <Menu
          anchorEl={toolsMenuAnchor}
          open={Boolean(toolsMenuAnchor)}
          onClose={() => setToolsMenuAnchor(null)}
          disableScrollLock
        >
          <MenuItem onClick={() => { setCitationSidebarOpen(true); setToolsMenuAnchor(null); }}>
            <ListItemIcon><CitationIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Citations</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setCommentSidebarOpen(true); setToolsMenuAnchor(null); }}>
            <ListItemIcon><CommentIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Comments</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { /* TODO: Version Control */ setToolsMenuAnchor(null); }}>
            <ListItemIcon><VersionIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Version Control</ListItemText>
          </MenuItem>
        </Menu>
      </Paper>

      {/* Toolbar */}
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

        {/* Page Size Dropdown */}
        <Tooltip title="Page Size">
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={pageSize}
              onChange={handlePageSizeChange}
              sx={{ 
                fontSize: 13,
                height: 32,
                '& .MuiSelect-select': { py: 0.5 },
              }}
              startAdornment={<PageSizeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
            >
              {PAGE_SIZE_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Font Family Dropdown */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={getCurrentFontFamily()}
            onChange={handleFontFamilyChange}
            sx={{ 
              fontSize: 13,
              height: 32,
              '& .MuiSelect-select': { py: 0.5 },
            }}
          >
            <MenuItem value="Default">Default</MenuItem>
            <MenuItem value="Times New Roman" sx={{ fontFamily: 'Times New Roman' }}>Times New Roman</MenuItem>
            <MenuItem value="Arial" sx={{ fontFamily: 'Arial' }}>Arial</MenuItem>
            <MenuItem value="Calibri" sx={{ fontFamily: 'Calibri' }}>Calibri</MenuItem>
            <MenuItem value="Georgia" sx={{ fontFamily: 'Georgia' }}>Georgia</MenuItem>
            <MenuItem value="Garamond" sx={{ fontFamily: 'Garamond' }}>Garamond</MenuItem>
            <MenuItem value="Helvetica" sx={{ fontFamily: 'Helvetica' }}>Helvetica</MenuItem>
          </Select>
        </FormControl>

        {/* Font Size Dropdown */}
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={getCurrentFontSize()}
            onChange={handleFontSizeChange}
            sx={{ 
              fontSize: 13,
              height: 32,
              '& .MuiSelect-select': { py: 0.5 },
            }}
          >
            <MenuItem value="Default">Default</MenuItem>
            <MenuItem value="8px">8</MenuItem>
            <MenuItem value="9px">9</MenuItem>
            <MenuItem value="10px">10</MenuItem>
            <MenuItem value="11px">11</MenuItem>
            <MenuItem value="12px">12</MenuItem>
            <MenuItem value="14px">14</MenuItem>
            <MenuItem value="16px">16</MenuItem>
            <MenuItem value="18px">18</MenuItem>
            <MenuItem value="20px">20</MenuItem>
            <MenuItem value="24px">24</MenuItem>
            <MenuItem value="28px">28</MenuItem>
            <MenuItem value="32px">32</MenuItem>
            <MenuItem value="36px">36</MenuItem>
            <MenuItem value="48px">48</MenuItem>
          </Select>
        </FormControl>

        {/* Heading Style Dropdown */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={getCurrentHeadingLevel()}
            onChange={handleHeadingChange}
            sx={{ 
              fontSize: 13,
              height: 32,
              '& .MuiSelect-select': { py: 0.5 },
            }}
          >
            <MenuItem value="paragraph">Paragraph</MenuItem>
            <MenuItem value="h1" sx={{ fontWeight: 700, fontSize: 16 }}>Heading 1</MenuItem>
            <MenuItem value="h2" sx={{ fontWeight: 700, fontSize: 15 }}>Heading 2</MenuItem>
            <MenuItem value="h3" sx={{ fontWeight: 600, fontSize: 14 }}>Heading 3</MenuItem>
            <MenuItem value="h4" sx={{ fontWeight: 600, fontSize: 13.5 }}>Heading 4</MenuItem>
            <MenuItem value="h5" sx={{ fontWeight: 600, fontSize: 13 }}>Heading 5</MenuItem>
            <MenuItem value="h6" sx={{ fontWeight: 600, fontSize: 12.5 }}>Heading 6</MenuItem>
          </Select>
        </FormControl>

        {/* Paragraph Button */}
        <Tooltip title="Convert to Paragraph (Ctrl+Alt+0)">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setParagraph().run()}
            sx={{ 
              bgcolor: editor.isActive('paragraph') ? `${ACCENT}20` : 'transparent',
              color: editor.isActive('paragraph') ? ACCENT : 'inherit',
            }}
          >
            <ParagraphIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

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

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Page Break */}
        <Tooltip title="Insert Page Break (Ctrl+Enter)">
          <IconButton
            size="small"
            onClick={handleInsertPageBreak}
          >
            <PageBreakIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Math Equation */}
        <Tooltip title="Insert Inline Math Formula">
          <IconButton
            size="small"
            onClick={handleInsertInlineMath}
          >
            <MathIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Citations */}
        <Tooltip title="Toggle Citation Library">
          <IconButton
            size="small"
            onClick={() => setCitationSidebarOpen(!citationSidebarOpen)}
            sx={{ 
              bgcolor: citationSidebarOpen ? `${ACCENT}20` : 'transparent',
              color: citationSidebarOpen ? ACCENT : 'inherit',
            }}
          >
            <CitationIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Comments */}
        <Tooltip title={selectedText ? "Add Comment" : "Select text to comment"}>
          <IconButton
            size="small"
            onClick={handleShowCommentForm}
            disabled={!selectedText}
            sx={{ 
              bgcolor: selectedText ? `${ACCENT}20` : 'transparent',
              color: selectedText ? ACCENT : 'inherit',
            }}
          >
            <AddCommentIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Toggle Comments Panel">
          <IconButton
            size="small"
            onClick={() => setCommentSidebarOpen(!commentSidebarOpen)}
            sx={{ 
              bgcolor: commentSidebarOpen ? `${ACCENT}20` : 'transparent',
              color: commentSidebarOpen ? ACCENT : 'inherit',
            }}
          >
            <CommentIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Editor Content with Outline and Comment Sidebar */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Document Outline Sidebar */}
        <DocumentOutline 
          editor={editor}
          open={outlineOpen}
          onToggle={handleToggleOutline}
        />

        {/* Main Editor Area */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            bgcolor: dark ? '#2d2d2d' : '#e5e5e5',
            py: 4,
            position: 'relative',
          }}
        >
          <PagedEditor 
            editor={editor} 
            pageSize={pageSize}
            showPageNumbers={true}
          />

          {/* Comment Form */}
          {showCommentForm && selectedText && (
            <CommentForm
              quotedText={selectedText.text}
              onSubmit={handleAddComment}
              onCancel={() => {
                setShowCommentForm(false);
                setSelectedText(null);
              }}
              position={commentFormPosition}
              collaborators={collaborators}
            />
          )}
        </Box>

        {/* Comment Sidebar */}
        {commentSidebarOpen && (
          <CommentSidebar
            comments={comments}
            filter={commentFilter}
            onFilterChange={setCommentFilter}
            onReply={handleReplyComment}
            onResolve={handleResolveComment}
            onDelete={handleDeleteComment}
            onCommentClick={(commentId) => {
              // Scroll to comment in editor
              const comment = comments.find(c => c.id === commentId);
              if (comment && comment.selection_start && editor) {
                editor.commands.setTextSelection({
                  from: comment.selection_start,
                  to: comment.selection_end,
                });
                editor.commands.focus();
              }
            }}
            currentUserId={currentUser?.id}
            collaborators={collaborators}
          />
        )}
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

      {/* Citation Sidebar */}
      <CitationSidebar
        open={citationSidebarOpen}
        onClose={() => setCitationSidebarOpen(false)}
        manuscriptId={params.id}
        onInsertCitation={handleInsertCitation}
        citationStyle={citationStyle}
        onStyleChange={setCitationStyle}
        existingCitations={citations}
      />

      {/* Bibliography Manager */}
      <BibliographyManager
        editor={editor}
        manuscriptId={params.id}
        citationStyle={citationStyle}
        citations={citations}
      />

      {/* Save Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
