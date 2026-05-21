'use client';
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Avatar,
  TextField,
  useTheme,
  Popper,
  MenuList,
  MenuItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as ResolvedIcon,
  RadioButtonUnchecked as UnresolvedIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Send as SendIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

export default function CommentSidebar({
  comments = [],
  filter = 'all',
  onFilterChange,
  onReply,
  onResolve,
  onDelete,
  onCommentClick,
  currentUserId,
  collaborators = [], // Array of users who can be mentioned
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const replyFieldRef = useRef(null);
  const mentionAnchorRef = useRef(null);

  const filteredComments = comments.filter(comment => {
    if (filter === 'open') return !comment.is_resolved;
    if (filter === 'resolved') return comment.is_resolved;
    return true;
  });

  const topLevelComments = filteredComments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => filteredComments.filter(c => c.parent_comment_id === commentId);

  const handleReply = useCallback((commentId) => {
    if (replyContent.trim()) {
      onReply(commentId, replyContent);
      setReplyContent('');
      setReplyingTo(null);
      setShowMentions(false);
    }
  }, [replyContent, onReply]);

  const handleReplyContentChange = (e) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    setReplyContent(newContent);

    // Check for @ symbol
    const textBeforeCursor = newContent.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
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
    (user.name && user.name.toLowerCase().includes(mentionSearch)) || 
    (user.email && user.email.toLowerCase().includes(mentionSearch))
  );

  const insertMention = (user) => {
    if (!replyFieldRef.current) return;
    const beforeMention = replyContent.substring(0, mentionPosition);
    const afterMention = replyContent.substring(replyFieldRef.current.selectionStart);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;
    setReplyContent(newContent);
    setShowMentions(false);
    setTimeout(() => replyFieldRef.current?.focus(), 0);
  };

  const handleReplyKeyDown = (e) => {
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
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const CommentThread = ({ comment, isReply = false }) => {
    const replies = getReplies(comment.id);
    const isOwn = comment.user_id === currentUserId;

    return (
      <Box sx={{ mb: isReply ? 1 : 2 }} data-comment-id={comment.id}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            bgcolor: comment.is_resolved
              ? dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              : dark ? 'rgba(28,167,161,0.1)' : 'rgba(28,167,161,0.05)',
            border: 1,
            borderColor: comment.is_resolved ? 'divider' : `${ACCENT}40`,
            borderLeft: isReply ? 'none' : 3,
            borderLeftColor: comment.is_resolved ? 'grey.400' : ACCENT,
            ml: isReply ? 2 : 0,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: comment.is_resolved
                ? dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
                : dark ? 'rgba(28,167,161,0.15)' : 'rgba(28,167,161,0.08)',
            },
          }}
          onClick={() => onCommentClick && onCommentClick(comment.id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: ACCENT,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {comment.user?.name?.[0] || comment.user?.email?.[0] || '?'}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                  {comment.user?.name || comment.user?.email}
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                  {formatTime(comment.created_at)}
                </Typography>
                {comment.is_resolved && (
                  <Chip
                    label="Resolved"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 9,
                      bgcolor: 'success.main',
                      color: 'white',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                )}
              </Box>

              {comment.quoted_text && (
                <Box
                  sx={{
                    mb: 1,
                    p: 0.75,
                    bgcolor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    borderLeft: 2,
                    borderColor: 'grey.400',
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontStyle: 'italic', color: 'text.secondary' }}>
                    "{comment.quoted_text}"
                  </Typography>
                </Box>
              )}

              <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                {!isReply && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    }}
                    sx={{ fontSize: 11 }}
                  >
                    <ReplyIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    <Typography sx={{ fontSize: 11 }}>Reply</Typography>
                  </IconButton>
                )}

                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(comment.id);
                  }}
                  sx={{ fontSize: 11 }}
                >
                  {comment.is_resolved ? (
                    <UnresolvedIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  ) : (
                    <ResolvedIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  )}
                  <Typography sx={{ fontSize: 11 }}>
                    {comment.is_resolved ? 'Reopen' : 'Resolve'}
                  </Typography>
                </IconButton>

                {isOwn && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this comment?')) {
                        onDelete(comment.id);
                      }
                    }}
                    sx={{ fontSize: 11, color: 'error.main' }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>

        {replyingTo === comment.id && (
          <Box sx={{ mt: 1, ml: 2 }}>
            <Box ref={mentionAnchorRef}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Write a reply... (use @ to mention)"
                value={replyContent}
                onChange={handleReplyContentChange}
                onKeyDown={handleReplyKeyDown}
                inputRef={replyFieldRef}
                size="small"
                autoFocus
                sx={{ mb: 1 }}
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
                          {user.name?.[0] || user.email?.[0] || '?'}
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
              <Button
                size="small"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => handleReply(comment.id)}
                disabled={!replyContent.trim()}
                sx={{
                  bgcolor: ACCENT,
                  '&:hover': { bgcolor: '#0e7490' },
                }}
              >
                Reply
              </Button>
            </Box>
          </Box>
        )}

        {replies.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {replies.map(reply => (
              <CommentThread key={reply.id} comment={reply} isReply />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: 350,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5 }}>
          Comments
        </Typography>

        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(e, value) => value && onFilterChange(value)}
          size="small"
          fullWidth
        >
          <ToggleButton value="all" sx={{ fontSize: 11, py: 0.5 }}>
            All ({comments.length})
          </ToggleButton>
          <ToggleButton value="open" sx={{ fontSize: 11, py: 0.5 }}>
            Open ({comments.filter(c => !c.is_resolved).length})
          </ToggleButton>
          <ToggleButton value="resolved" sx={{ fontSize: 11, py: 0.5 }}>
            Resolved ({comments.filter(c => c.is_resolved).length})
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {topLevelComments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              {filter === 'resolved' ? 'No resolved comments' : 'No comments yet'}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 1 }}>
              Select text to add a comment
            </Typography>
          </Box>
        ) : (
          topLevelComments.map(comment => (
            <CommentThread key={comment.id} comment={comment} />
          ))
        )}
      </Box>
    </Box>
  );
}
