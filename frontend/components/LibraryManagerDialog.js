'use client';
import { useState } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogContent, DialogTitle, DialogActions,
  Paper, IconButton, Menu, MenuItem, Divider, Tooltip,
} from '@mui/material';
import {
  Folder as FolderIcon, FolderOpen as FolderOpenIcon, LibraryBooks as LibraryIcon,
  Add as AddIcon, MoreVert as MoreIcon, Edit as EditIcon, Delete as DeleteIcon,
  DriveFileMove as MoveIcon, ExpandMore as ExpandIcon, ChevronRight as CollapseIcon,
  CheckBox as CheckIcon, Article as ArticleIcon,
} from '@mui/icons-material';

const ACCENT = '#1ca7a1';

export default function LibraryManagerDialog({
  open,
  onClose,
  libraries,
  selectedLibrary,
  setSelectedLibrary,
  selectedFolder,
  setSelectedFolder,
  expandedFolders,
  toggleFolder,
  currentImportPub,
  onConfirmImport,
  theme,
  // CRUD functions passed from parent
  onCreateLibrary,
  onDeleteLibrary,
  onRenameLibrary,
  onMoveLibrary,
  onDeletePublication,
  onMovePublication,
}) {
  const dark = theme.palette.mode === 'dark';
  
  const [newLibraryName, setNewLibraryName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [renameDialog, setRenameDialog] = useState({ open: false, item: null, newName: '' });
  const [moveDialog, setMoveDialog] = useState({ open: false, item: null, targetId: null });
  const [newFolderParent, setNewFolderParent] = useState(undefined);

  const createLibrary = async (parentId = null, isFolder = false) => {
    if (!newLibraryName.trim()) return;
    await onCreateLibrary(newLibraryName, parentId, isFolder);
    setNewLibraryName('');
    setNewFolderParent(undefined);
    if (parentId && !expandedFolders.includes(parentId)) {
      toggleFolder(parentId);
    }
  };

  const deleteLibraryItem = async (id) => {
    await onDeleteLibrary(id);
    if (selectedFolder === id) setSelectedFolder(null);
    setContextMenu(null);
  };

  const renameLibraryItem = async () => {
    if (!renameDialog.newName.trim()) return;
    await onRenameLibrary(renameDialog.item.id, renameDialog.newName);
    setRenameDialog({ open: false, item: null, newName: '' });
  };

  const moveLibraryItem = async () => {
    if (moveDialog.targetId === undefined) return;
    await onMoveLibrary(moveDialog.item.id, moveDialog.targetId);
    setMoveDialog({ open: false, item: null, targetId: null });
  };

  const movePublication = async (pubId, toLibId) => {
    await onMovePublication(pubId, selectedFolder, toLibId);
  };

  const deletePublication = async (pubId) => {
    if (!confirm('Delete this publication?')) return;
    await onDeletePublication(pubId, selectedFolder);
  };

  const getLibraryTree = (parentId = null) => {
    return libraries.filter(lib => lib.parentId === parentId);
  };

  const renderLibraryTree = (parentId = null, depth = 0) => {
    const items = getLibraryTree(parentId);
    
    return items.map(item => {
      const isExpanded = expandedFolders.includes(item.id);
      const hasChildren = libraries.some(lib => lib.parentId === item.id);
      const isSelected = selectedLibrary === item.id;
      
      return (
        <Box key={item.id}>
          <Box
            onClick={() => setSelectedLibrary(item.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, item });
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              py: 0.75,
              px: 1,
              ml: depth * 2,
              cursor: 'pointer',
              borderRadius: 1,
              bgcolor: isSelected ? `${ACCENT}15` : 'transparent',
              '&:hover': { bgcolor: isSelected ? `${ACCENT}15` : 'action.hover' },
            }}
          >
            {hasChildren && (
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); toggleFolder(item.id); }}
                sx={{ p: 0.25 }}
              >
                {isExpanded ? <ExpandIcon sx={{ fontSize: 16 }} /> : <CollapseIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 20 }} />}
            
            {item.isFolder ? (
              isExpanded ? <FolderOpenIcon sx={{ fontSize: 18, color: ACCENT }} /> : <FolderIcon sx={{ fontSize: 18, color: ACCENT }} />
            ) : (
              <LibraryIcon sx={{ fontSize: 18, color: '#64748b' }} />
            )}
            
            <Typography sx={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, flex: 1 }}>
              {item.name}
            </Typography>
            
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              {item.publications?.length || 0}
            </Typography>
            
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, item });
              }}
              sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}
            >
              <MoreIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          
          {isExpanded && hasChildren && renderLibraryTree(item.id, depth + 1)}
        </Box>
      );
    });
  };

  const selectedLib = libraries.find(lib => lib.id === selectedFolder);
  const publications = selectedLib?.publications || [];

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="xl" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3, height: '85vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Library Manager</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
                Organize and manage your publication libraries
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, display: 'flex', height: 'calc(100% - 120px)' }}>
          {/* LEFT PANEL - Library Tree */}
          <Box sx={{ width: '35%', borderRight: '1px solid', borderColor: 'divider', p: 2, overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Libraries & Folders</Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setNewFolderParent(null)}
                sx={{ textTransform: 'none', fontSize: 12 }}
              >
                New
              </Button>
            </Box>
            
            {newFolderParent !== undefined && (
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 1 }}>
                  {newFolderParent === null ? 'Create New Library' : 'Create New Folder'}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter name..."
                  value={newLibraryName}
                  onChange={(e) => setNewLibraryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createLibrary(newFolderParent, newFolderParent !== null)}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => createLibrary(newFolderParent, newFolderParent !== null)}
                    disabled={!newLibraryName.trim()}
                    sx={{ textTransform: 'none', fontSize: 11, bgcolor: ACCENT, '&:hover': { bgcolor: '#0e7490' } }}
                  >
                    Create
                  </Button>
                  <Button
                    size="small"
                    onClick={() => { setNewLibraryName(''); setNewFolderParent(undefined); }}
                    sx={{ textTransform: 'none', fontSize: 11 }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Paper>
            )}
            
            <Box>
              {renderLibraryTree()}
            </Box>
          </Box>
          
          {/* RIGHT PANEL - Publications */}
          <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
            {selectedLibrary ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{selectedLib?.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {publications.length} publication{publications.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>
                
                {publications.length === 0 ? (
                  <Paper elevation={0} variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
                    <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                      No publications in this library yet
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {publications.map(pub => (
                      <Paper key={pub.id} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>{pub.title}</Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {pub.authors} — {pub.journal} ({pub.year})
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Move to another library">
                              <IconButton size="small" onClick={() => setMoveDialog({ open: true, item: pub, targetId: null })}>
                                <MoveIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => deletePublication(pub.id)}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </>
            ) : (
              <Paper elevation={0} variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
                <LibraryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                  Select a library from the left panel
                </Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onConfirmImport}
            disabled={!selectedLibrary}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              bgcolor: ACCENT,
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            Import to Selected Library
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        {contextMenu?.item?.isFolder && (
          <MenuItem onClick={() => { setNewFolderParent(contextMenu.item.id); setContextMenu(null); }}>
            <AddIcon sx={{ fontSize: 16, mr: 1.5 }} /> Add Subfolder
          </MenuItem>
        )}
        <MenuItem onClick={() => { setRenameDialog({ open: true, item: contextMenu?.item, newName: contextMenu?.item?.name || '' }); setContextMenu(null); }}>
          <EditIcon sx={{ fontSize: 16, mr: 1.5 }} /> Rename
        </MenuItem>
        <MenuItem onClick={() => { setMoveDialog({ open: true, item: contextMenu?.item, targetId: null }); setContextMenu(null); }}>
          <MoveIcon sx={{ fontSize: 16, mr: 1.5 }} /> Move
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => deleteLibraryItem(contextMenu?.item?.id)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ fontSize: 16, mr: 1.5 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.open} onClose={() => setRenameDialog({ open: false, item: null, newName: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Rename {renameDialog.item?.isFolder ? 'Folder' : 'Library'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            label="New Name"
            value={renameDialog.newName}
            onChange={(e) => setRenameDialog(prev => ({ ...prev, newName: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && renameLibraryItem()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog({ open: false, item: null, newName: '' })}>Cancel</Button>
          <Button onClick={renameLibraryItem} variant="contained" sx={{ bgcolor: ACCENT }}>Rename</Button>
        </DialogActions>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={moveDialog.open} onClose={() => setMoveDialog({ open: false, item: null, targetId: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Move {moveDialog.item?.isFolder ? 'Folder' : 'Library'}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            Select destination:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Paper
              elevation={0}
              variant="outlined"
              onClick={() => setMoveDialog(prev => ({ ...prev, targetId: null }))}
              sx={{
                p: 1.5,
                cursor: 'pointer',
                borderColor: moveDialog.targetId === null ? ACCENT : 'divider',
                bgcolor: moveDialog.targetId === null ? `${ACCENT}08` : 'transparent',
              }}
            >
              <Typography sx={{ fontSize: 13 }}>Root Level</Typography>
            </Paper>
            {libraries.filter(lib => lib.id !== moveDialog.item?.id).map(lib => (
              <Paper
                key={lib.id}
                elevation={0}
                variant="outlined"
                onClick={() => setMoveDialog(prev => ({ ...prev, targetId: lib.id }))}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  borderColor: moveDialog.targetId === lib.id ? ACCENT : 'divider',
                  bgcolor: moveDialog.targetId === lib.id ? `${ACCENT}08` : 'transparent',
                }}
              >
                <Typography sx={{ fontSize: 13 }}>{lib.name}</Typography>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialog({ open: false, item: null, targetId: null })}>Cancel</Button>
          <Button onClick={moveLibraryItem} variant="contained" sx={{ bgcolor: ACCENT }}>Move</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
