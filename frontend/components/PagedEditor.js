'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { EditorContent } from '@tiptap/react';
import { Box, Typography } from '@mui/material';
import { getPageDimensions, getContentDimensions, calculatePageCount } from '@/lib/page-config';

export default function PagedEditor({ editor, pageSize = 'A4', showPageNumbers = true }) {
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const editorContainerRef = useRef(null);
  const observerRef = useRef(null);

  const pageDimensions = useMemo(() => getPageDimensions(pageSize), [pageSize]);
  const contentDimensions = useMemo(() => getContentDimensions(pageSize), [pageSize]);

  // Calculate page count based on content height
  const updatePageCount = () => {
    if (!editorContainerRef.current) return;

    const editorElement = editorContainerRef.current.querySelector('.ProseMirror');
    if (!editorElement) return;

    const contentHeight = editorElement.scrollHeight;
    const newPageCount = calculatePageCount(contentHeight, pageSize);
    
    if (newPageCount !== pageCount && newPageCount > 0) {
      setPageCount(newPageCount);
    }
  };

  // Track which page is currently visible in viewport
  const updateCurrentPage = () => {
    if (!editorContainerRef.current) return;

    const container = editorContainerRef.current.parentElement;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const pageHeight = pageDimensions.height + 20; // Include gap
    const newCurrentPage = Math.min(Math.floor(scrollTop / pageHeight) + 1, pageCount);
    
    if (newCurrentPage !== currentPage && newCurrentPage > 0) {
      setCurrentPage(newCurrentPage);
    }
  };

  // Set up MutationObserver to watch for content changes
  useEffect(() => {
    if (!editor || !editorContainerRef.current) return;

    const editorElement = editorContainerRef.current.querySelector('.ProseMirror');
    if (!editorElement) return;

    // Initial calculation
    setTimeout(updatePageCount, 100);

    // Watch for content changes
    observerRef.current = new MutationObserver(() => {
      setTimeout(updatePageCount, 50);
    });

    observerRef.current.observe(editorElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Listen to editor updates
    const handleUpdate = () => {
      setTimeout(updatePageCount, 50);
    };

    editor.on('update', handleUpdate);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      editor.off('update', handleUpdate);
    };
  }, [editor, pageSize]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(updatePageCount, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pageSize]);

  // Handle scroll for current page tracking
  useEffect(() => {
    const handleScroll = () => {
      updateCurrentPage();
    };

    const scrollContainer = editorContainerRef.current?.parentElement;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [pageCount, pageDimensions]);

  if (!editor) return null;

  return (
    <Box
      ref={editorContainerRef}
      className="paged-editor-wrapper"
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Single container with page visual overlays */}
      <Box
        className="page-container"
        sx={{
          position: 'relative',
          width: `${pageDimensions.width}px`,
          minHeight: `${pageDimensions.height}px`,
          bgcolor: 'background.paper',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* Page break markers */}
        {Array.from({ length: pageCount - 1 }).map((_, index) => {
          const pageBreakY = (index + 1) * contentDimensions.height + pageDimensions.marginTop;
          return (
            <Box
              key={index}
              className="page-break-visual"
              sx={{
                position: 'absolute',
                top: `${pageBreakY}px`,
                left: 0,
                right: 0,
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 5,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: pageDimensions.marginLeft,
                  right: pageDimensions.marginRight,
                  height: '1px',
                  bgcolor: 'divider',
                  opacity: 0.3,
                }
              }}
            />
          );
        })}

        {/* Page numbers */}
        {showPageNumbers && Array.from({ length: pageCount }).map((_, index) => {
          const pageNumberY = (index + 1) * pageDimensions.height - pageDimensions.marginBottom / 2;
          return (
            <Typography
              key={index}
              className="page-number"
              sx={{
                position: 'absolute',
                top: `${pageNumberY}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 11,
                color: 'text.secondary',
                userSelect: 'none',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              {index + 1}
            </Typography>
          );
        })}

        {/* Editor content */}
        <Box
          className="editor-content-wrapper"
          sx={{
            pt: `${pageDimensions.marginTop}px`,
            pr: `${pageDimensions.marginRight}px`,
            pb: `${pageDimensions.marginBottom}px`,
            pl: `${pageDimensions.marginLeft}px`,
            minHeight: `${contentDimensions.height}px`,
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>

      {/* Page count indicator */}
      {pageCount > 1 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: 'background.paper',
            px: 2,
            py: 1,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
            Page {currentPage} of {pageCount}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
