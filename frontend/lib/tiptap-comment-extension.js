import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const Comment = Mark.create({
  name: 'comment',

  // Prevent the mark from expanding when typing at the edges
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentClick: null,
      onCommentDeleted: null,
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {};
          }
          return {
            'data-comment-id': attributes.commentId,
          };
        },
      },
      isResolved: {
        default: false,
        parseHTML: element => element.getAttribute('data-resolved') === 'true',
        renderHTML: attributes => {
          return {
            'data-resolved': attributes.isResolved ? 'true' : 'false',
          };
        },
      },
      commentText: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-text'),
        renderHTML: attributes => {
          if (!attributes.commentText) {
            return {};
          }
          return {
            'data-comment-text': attributes.commentText,
            'title': `💬 ${attributes.commentText}\n\nClick to view all comments`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      class: 'comment-highlight',
      style: 'cursor: pointer;',
    }), 0];
  },

  addCommands() {
    return {
      setComment: (commentId, commentText = null) => ({ commands }) => {
        return commands.setMark(this.name, { commentId, isResolved: false, commentText });
      },
      unsetComment: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
      toggleComment: (commentId) => ({ commands }) => {
        return commands.toggleMark(this.name, { commentId, isResolved: false });
      },
      removeCommentMark: (commentId) => ({ tr, state, dispatch }) => {
        const { doc } = state;
        let modified = false;

        doc.descendants((node, pos) => {
          if (node.marks) {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.commentId === commentId) {
                tr.removeMark(pos, pos + node.nodeSize, mark.type);
                modified = true;
              }
            });
          }
        });

        if (dispatch && modified) {
          dispatch(tr);
        }

        return modified;
      },
      updateCommentResolved: (commentId, isResolved) => ({ tr, state }) => {
        const { doc } = state;
        let modified = false;

        doc.descendants((node, pos) => {
          if (node.marks) {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.commentId === commentId) {
                tr.removeMark(pos, pos + node.nodeSize, mark.type);
                tr.addMark(pos, pos + node.nodeSize, mark.type.create({
                  commentId,
                  isResolved,
                }));
                modified = true;
              }
            });
          }
        });

        return modified;
      },
    };
  },

  addProseMirrorPlugins() {
    const { onCommentDeleted, onCommentClick } = this.options;

    return [
      // Click handler plugin
      new Plugin({
        key: new PluginKey('commentClick'),
        props: {
          handleClick: (view, pos, event) => {
            const { doc } = view.state;
            const clickedNode = doc.nodeAt(pos);
            
            if (!clickedNode) return false;

            // Check if clicked on a comment mark
            const commentMark = clickedNode.marks.find(
              mark => mark.type.name === this.name
            );

            if (commentMark && onCommentClick) {
              event.preventDefault();
              onCommentClick(commentMark.attrs.commentId);
              return true;
            }

            return false;
          },
        },
      }),
      // Deletion tracker plugin
      new Plugin({
        key: new PluginKey('commentDeletion'),
        appendTransaction: (transactions, oldState, newState) => {
          // Check if any transaction modified the document
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged || !onCommentDeleted) return null;

          // Track which comment IDs exist in the new document
          const existingCommentIds = new Set();
          newState.doc.descendants((node) => {
            if (node.marks) {
              node.marks.forEach((mark) => {
                if (mark.type.name === this.name) {
                  existingCommentIds.add(mark.attrs.commentId);
                }
              });
            }
          });

          // Track which comment IDs existed in the old document
          const oldCommentIds = new Set();
          oldState.doc.descendants((node) => {
            if (node.marks) {
              node.marks.forEach((mark) => {
                if (mark.type.name === this.name) {
                  oldCommentIds.add(mark.attrs.commentId);
                }
              });
            }
          });

          // Find deleted comments
          const deletedCommentIds = [...oldCommentIds].filter(
            id => !existingCommentIds.has(id)
          );

          // Notify about deleted comments
          if (deletedCommentIds.length > 0) {
            deletedCommentIds.forEach(commentId => {
              onCommentDeleted(commentId);
            });
          }

          return null;
        },
      }),
    ];
  },
});

export default Comment;
