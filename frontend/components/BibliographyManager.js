'use client';
import { useEffect } from 'react';

const ACCENT = '#1ca7a1';

export default function BibliographyManager({ editor, manuscriptId, citationStyle, citations }) {
  useEffect(() => {
    if (!editor || citations.length === 0) return;

    const updateBibliography = async () => {
      try {
        const token = localStorage.getItem('token');
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

    updateBibliography();
  }, [editor, manuscriptId, citationStyle, citations]);

  const insertOrUpdateBibliography = (bibliographyHtml) => {
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
      // Remove existing bibliography section (heading + content)
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

      // Delete old bibliography
      editor.chain().focus().deleteRange({ from: bibliographyPos, to: endPos }).run();
    }

    // Insert new bibliography at the end
    editor
      .chain()
      .focus()
      .setTextSelection(doc.content.size)
      .insertContent(`<div class="bibliography-section">${bibliographyHtml}</div>`)
      .run();
  };

  return null; // This component doesn't render anything
}
