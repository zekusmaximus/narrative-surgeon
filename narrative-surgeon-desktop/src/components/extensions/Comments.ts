import { Extension, Mark } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface CommentOptions {
  HTMLAttributes: Record<string, any>;
  onCommentClick?: (commentId: string, comment: CommentInfo) => void;
  onCommentCreate?: (comment: CommentInfo) => void;
  onCommentDelete?: (commentId: string) => void;
}

interface CommentInfo {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  position: number;
  resolved: boolean;
  replies?: CommentReply[];
}

interface CommentReply {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

interface CommentState {
  comments: CommentInfo[];
  activeComment: string | null;
  decorations: DecorationSet;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Add a comment to the selected text
       */
      addComment: (text: string, author: string) => ReturnType;
      /**
       * Remove a comment
       */
      removeComment: (commentId: string) => ReturnType;
      /**
       * Resolve/unresolve a comment
       */
      toggleCommentResolution: (commentId: string) => ReturnType;
      /**
       * Reply to a comment
       */
      replyToComment: (commentId: string, text: string, author: string) => ReturnType;
      /**
       * Set active comment for UI highlighting
       */
      setActiveComment: (commentId: string | null) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentOptions>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentClick: undefined,
      onCommentCreate: undefined,
      onCommentDelete: undefined,
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
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment-id]',
        getAttrs: element => {
          const commentId = (element as HTMLElement).getAttribute('data-comment-id');
          return commentId ? { commentId } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', {
      ...this.options.HTMLAttributes,
      ...HTMLAttributes,
      class: 'comment-highlight',
    }, 0];
  },
});

export const CommentsExtension = Extension.create<CommentOptions>({
  name: 'comments',

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentClick: undefined,
      onCommentCreate: undefined,
      onCommentDelete: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('comments'),
        
        state: {
          init(): CommentState {
            return {
              comments: [],
              activeComment: null,
              decorations: DecorationSet.empty,
            };
          },

          apply(tr, oldState): CommentState {
            let { comments, activeComment, decorations } = oldState;

            // Handle comment-related transactions
            const commentMeta = tr.getMeta('comments');
            if (commentMeta) {
              switch (commentMeta.type) {
                case 'add':
                  const newComment: CommentInfo = {
                    id: commentMeta.commentId,
                    text: commentMeta.text,
                    author: commentMeta.author,
                    timestamp: Date.now(),
                    position: commentMeta.position,
                    resolved: false,
                    replies: [],
                  };
                  comments = [...comments, newComment];
                  
                  // Notify parent component
                  if (this.options.onCommentCreate) {
                    this.options.onCommentCreate(newComment);
                  }
                  break;

                case 'remove':
                  comments = comments.filter(c => c.id !== commentMeta.commentId);
                  
                  // Notify parent component
                  if (this.options.onCommentDelete) {
                    this.options.onCommentDelete(commentMeta.commentId);
                  }
                  break;

                case 'toggle-resolution':
                  comments = comments.map(c =>
                    c.id === commentMeta.commentId
                      ? { ...c, resolved: !c.resolved }
                      : c
                  );
                  break;

                case 'reply':
                  comments = comments.map(c =>
                    c.id === commentMeta.commentId
                      ? {
                          ...c,
                          replies: [
                            ...(c.replies || []),
                            {
                              id: commentMeta.replyId,
                              text: commentMeta.text,
                              author: commentMeta.author,
                              timestamp: Date.now(),
                            }
                          ]
                        }
                      : c
                  );
                  break;

                case 'set-active':
                  activeComment = commentMeta.commentId;
                  break;
              }
            }

            // Update decorations based on document changes
            decorations = decorations.map(tr.mapping, tr.doc);

            // Add decorations for comment highlights
            const newDecorations: Decoration[] = [];
            comments.forEach(comment => {
              const pos = tr.mapping.map(comment.position);
              if (pos >= 0 && pos < tr.doc.content.size) {
                const decoration = Decoration.widget(pos, () => {
                  const icon = document.createElement('span');
                  icon.className = `comment-icon ${comment.resolved ? 'comment-resolved' : 'comment-active'}`;
                  icon.innerHTML = '💬';
                  icon.style.cssText = `
                    position: absolute;
                    right: -24px;
                    top: 0;
                    cursor: pointer;
                    font-size: 12px;
                    opacity: ${activeComment === comment.id ? 1 : 0.6};
                    color: ${comment.resolved ? '#6b7280' : '#3b82f6'};
                  `;
                  icon.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.options.onCommentClick) {
                      this.options.onCommentClick(comment.id, comment);
                    }
                  });
                  return icon;
                }, {
                  side: 1,
                  key: `comment-${comment.id}`,
                });
                newDecorations.push(decoration);
              }
            });

            decorations = decorations.add(tr.doc, newDecorations);

            return {
              comments,
              activeComment,
              decorations,
            };
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)?.decorations;
          },

          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('comment-icon')) {
              return true; // Handled by the decoration click handler
            }
            return false;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      addComment:
        (text: string, author: string) =>
        ({ state, dispatch, view }) => {
          const { from, to } = state.selection;
          if (from === to) return false;

          const commentId = `comment-${Date.now()}`;
          
          if (dispatch) {
            const tr = state.tr
              .addMark(from, to, this.editor.schema.marks.comment.create({ commentId }))
              .setMeta('comments', {
                type: 'add',
                commentId,
                text,
                author,
                position: from,
              });
            dispatch(tr);
          }

          return true;
        },

      removeComment:
        (commentId: string) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            // Remove the mark from the document
            const tr = state.tr;
            state.doc.descendants((node, pos) => {
              const commentMark = node.marks.find(
                mark => mark.type.name === 'comment' && mark.attrs.commentId === commentId
              );
              if (commentMark) {
                tr.removeMark(pos, pos + node.nodeSize, commentMark);
              }
            });

            // Remove from comment state
            tr.setMeta('comments', {
              type: 'remove',
              commentId,
            });

            dispatch(tr);
          }

          return true;
        },

      toggleCommentResolution:
        (commentId: string) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('comments', {
              type: 'toggle-resolution',
              commentId,
            });
            dispatch(tr);
          }

          return true;
        },

      replyToComment:
        (commentId: string, text: string, author: string) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('comments', {
              type: 'reply',
              commentId,
              replyId: `reply-${Date.now()}`,
              text,
              author,
            });
            dispatch(tr);
          }

          return true;
        },

      setActiveComment:
        (commentId: string | null) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('comments', {
              type: 'set-active',
              commentId,
            });
            dispatch(tr);
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => {
        const { from, to } = this.editor.state.selection;
        if (from === to) return false;

        // This would trigger a UI dialog to add comment text
        // For now, we'll add a placeholder comment
        return this.editor.commands.addComment('New comment', 'Anonymous');
      },
    };
  },
});

// Utility function to get all comments from editor state
export function getComments(editor: any): CommentInfo[] {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'comments');
  return plugin?.getState(editor.state)?.comments || [];
}

// Utility function to get active comment
export function getActiveComment(editor: any): string | null {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'comments');
  return plugin?.getState(editor.state)?.activeComment || null;
}

export type { CommentInfo, CommentReply, CommentOptions };