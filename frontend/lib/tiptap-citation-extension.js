import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import Suggestion from '@tiptap/suggestion';

export const Citation = Node.create({
  name: 'citation',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      suggestion: {
        char: '@',
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertCitation(props)
            .run();
        },
      },
    };
  },

  addAttributes() {
    return {
      citationId: {
        default: null,
        parseHTML: element => element.getAttribute('data-citation-id'),
        renderHTML: attributes => {
          if (!attributes.citationId) {
            return {};
          }
          return {
            'data-citation-id': attributes.citationId,
          };
        },
      },
      citationKey: {
        default: null,
        parseHTML: element => element.getAttribute('data-citation-key'),
        renderHTML: attributes => {
          if (!attributes.citationKey) {
            return {};
          }
          return {
            'data-citation-key': attributes.citationKey,
          };
        },
      },
      publicationId: {
        default: null,
        parseHTML: element => element.getAttribute('data-publication-id'),
        renderHTML: attributes => {
          if (!attributes.publicationId) {
            return {};
          }
          return {
            'data-publication-id': attributes.publicationId,
          };
        },
      },
      inlineText: {
        default: '',
        parseHTML: element => element.textContent,
        renderHTML: attributes => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'citation-node',
      }),
      HTMLAttributes.inlineText || '[Citation]',
    ];
  },

  addCommands() {
    return {
      insertCitation: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
      deleteCitation: (citationId) => ({ tr, state }) => {
        const { doc } = state;
        let pos = null;

        doc.descendants((node, nodePos) => {
          if (node.type.name === 'citation' && node.attrs.citationId === citationId) {
            pos = nodePos;
            return false;
          }
        });

        if (pos !== null) {
          tr.delete(pos, pos + 1);
          return true;
        }

        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
      new Plugin({
        key: new PluginKey('citationPlugin'),
        props: {
          decorations(state) {
            const decorations = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (node.type.name === 'citation') {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: 'citation-decoration',
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

export default Citation;
