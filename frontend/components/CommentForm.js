'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  useTheme,
  Popper,
  MenuList,
  MenuItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

export default function CommentForm({
  quotedText,
  onSubmit,
  onCancel,
  position = { top: 0, left: 0 },
  collaborators = [], // Array of users who can be mentioned
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textFieldRef = useRef(null);
  const mentionAnchorRef = useRef(null);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent('');
      setShowMentions(false);
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(newContent);

    // Check for @ symbol
    const textBeforeCursor = newContent.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setMentionPosition(lastAtIndex);
        setShowMentions(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const filteredCollaborators = collaborators.filter(user => 
    user.name.toLowerCase().includes(mentionSearch) || 
    user.email.toLowerCase().includes(mentionSearch)
  );

  const insertMention = (user) => {
    const beforeMention = content.substring(0, mentionPosition);
    const afterMention = content.substring(textFieldRef.current.selectionStart);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;
    setContent(newContent);
    setShowMentions(false);
    textFieldRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (showMentions && filteredCollaborators.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          prev < filteredCollaborators.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => 
          prev > 0 ? prev - 1 : filteredCollaborators.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredCollaborators[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: 320,
        zIndex: 1000,
        bgcolor: 'background.paper',
        border: 2,
        borderColor: ACCENT,
      }}
    >
      <Box
        sx={{
          p: 1.5,
          bgcolor: ACCENT,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
          Add Comment
        </Typography>
        <IconButton size="small" onClick={onCancel} sx={{ color: 'white' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {quotedText && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
            Selected text:
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              fontStyle: 'italic',
              color: 'text.secondary',
              maxHeight: 60,
              overflow: 'auto',
            }}
          >
            "{quotedText}"
          </Typography>
        </Box>
      )}

      <Box sx={{ p: 1.5 }}>
        <Box ref={mentionAnchorRef}>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Write your comment... (use @ to mention)"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            inputRef={textFieldRef}
            autoFocus
            sx={{ mb: 1.5 }}
          />
        </Box>

        {/* Mentions Dropdown */}
        <Popper
          open={showMentions && filteredCollaborators.length > 0}
          anchorEl={mentionAnchorRef.current}
          placement="bottom-start"
          style={{ zIndex: 1300 }}
        >
          <Paper elevation={8} sx={{ maxHeight: 200, overflow: 'auto', minWidth: 250 }}>
            <MenuList>
              {filteredCollaborators.map((user, index) => (
                <MenuItem
                  key={user.id}
                  selected={index === selectedMentionIndex}
                  onClick={() => insertMention(user)}
                  sx={{
                    bgcolor: index === selectedMentionIndex ? `${ACCENT}20` : 'transparent',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: ACCENT, fontSize: 12 }}>
                      {user.name[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={user.email}
                    primaryTypographyProps={{ fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </MenuItem>
              ))}
            </MenuList>
          </Paper>
        </Popper>

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={!content.trim()}
            sx={{
              bgcolor: ACCENT,
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            Comment
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
