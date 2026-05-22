'use client';
import { useEffect } from 'react';

const ACCENT = '#1ca7a1';

export default function BibliographyManager({ editor, manuscriptId, citationStyle, citations }) {
  useEffect(() => {
    if (!editor) return;

    // If no citations, remove bibliography section
    if (citations.length === 0) {
      removeBibliography();
      return;
    }

    const updateBibliography = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Get unique citations only (deduplicate by publication_id)
        const uniqueCitations = Array.from(
          new Map(citations.map(c => [c.publication_id, c])).values()
        );
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || '/api'}/manuscripts/${manuscriptId}/bibliography?style=${citationStyle}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          insertOrUpdateBibliography(data.html);
        }
      } catch (error) {
        console.error('Error fetching bibliography:', error);
      }
    };

    // Debounce the update to avoid too many API calls
    const timeoutId = setTimeout(updateBibliography, 500);
    return () => clearTimeout(timeoutId);
  }, [editor, manuscriptId, citationStyle, citations]);

  const removeBibliography = () => {
    if (!editor) return;

    const { state } = editor;
    const { doc } = state;
    let bibliographyPos = null;
    let bibliographyNode = null;

    // Find existing bibliography section
    doc.descendants((node, pos) => {
      if (
        node.type.name === 'heading' &&
        node.attrs.level === 2 &&
        node.textContent.match(/^(References|Bibliography|Works Cited)$/i)
      ) {
        bibliographyPos = pos;
        bibliographyNode = node;
        return false;
      }
    });

    if (bibliographyPos !== null) {
      // Remove bibliography section
      let endPos = bibliographyPos + bibliographyNode.nodeSize;
      
      // Find the end of bibliography content
      doc.nodesBetween(bibliographyPos, doc.content.size, (node, pos) => {
        if (pos > bibliographyPos && node.type.name === 'heading' && node.attrs.level <= 2) {
          endPos = pos;
          return false;
        }
        if (pos > bibliographyPos) {
          endPos = pos + node.nodeSize;
        }
      });

      // Delete bibliography
      editor.chain().focus().deleteRange({ from: bibliographyPos, to: endPos }).run();
    }
  };

  const insertOrUpdateBibliography = (bibliographyHtml) => {
    if (!editor) return;

    const { state } = editor;
    const { doc } = state;
    let bibliographyPos = null;
    let bibliographyNode = null;
    let contentStartPos = null;
    let endPos = null;

    // Find existing bibliography section
    doc.descendants((node, pos) => {
      if (
        node.type.name === 'heading' &&
        node.attrs.level === 2 &&
        node.textContent.match(/^(References|Bibliography|Works Cited)$/i)
      ) {
        bibliographyPos = pos;
        bibliographyNode = node;
        contentStartPos = pos + node.nodeSize; // Position right after the heading
        return false;
      }
    });

    if (bibliographyPos !== null) {
      // Bibliography heading exists - just update the content below it
      endPos = contentStartPos;
      
      // Find the end of bibliography content (stop at next heading or document end)
      doc.nodesBetween(contentStartPos, doc.content.size, (node, pos) => {
        if (node.type.name === 'heading' && node.attrs.level <= 2) {
          endPos = pos;
          return false;
        }
        endPos = pos + node.nodeSize;
      });

      // Delete only the old bibliography content (not the heading)
      if (endPos > contentStartPos) {
        editor.chain().focus().deleteRange({ from: contentStartPos, to: endPos }).run();
      }

      // Insert updated bibliography content after the heading
      editor
        .chain()
        .focus()
        .setTextSelection(contentStartPos)
        .insertContent(bibliographyHtml)
        .run();
    } else {
      // No bibliography heading exists - insert both heading and content at the end
      const insertPos = doc.content.size;
      
      editor
        .chain()
        .focus()
        .setTextSelection(insertPos)
        .insertContent([
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'References' }],
          },
          {
            type: 'paragraph',
            content: [],
          },
        ])
        .insertContent(bibliographyHtml)
        .run();
    }
  };

  return null; // This component doesn't render anything
}
