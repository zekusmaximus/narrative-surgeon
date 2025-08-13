import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, EditorState, Transaction } from '@tiptap/pm/state';

interface TypewriterModeOptions {
  enabled: boolean;
  scrollOffset: number; // Offset from center in pixels
  smoothScroll: boolean;
  animationDuration: number; // Duration in milliseconds
}

interface TypewriterState {
  enabled: boolean;
  scrollOffset: number;
  smoothScroll: boolean;
  animationDuration: number;
}

// Command augmentation centralized in ambient.d.ts

export const TypewriterModeExtension = Extension.create<TypewriterModeOptions>({
  name: 'typewriterMode',

  addOptions() {
    return {
      enabled: false,
      scrollOffset: 0,
      smoothScroll: true,
      animationDuration: 200,
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
      scrollOffset: this.options.scrollOffset,
      smoothScroll: this.options.smoothScroll,
      animationDuration: this.options.animationDuration,
    };
  },

  addProseMirrorPlugins() {
    const typewriterKey = new PluginKey<TypewriterState>('typewriterMode');
    const opts = this.options;
    return [
      new Plugin({
        key: typewriterKey,
        
        state: {
      init(): TypewriterState {
            return {
        enabled: opts.enabled || false,
        scrollOffset: opts.scrollOffset || 0,
        smoothScroll: opts.smoothScroll !== false,
        animationDuration: opts.animationDuration || 200,
            };
          },

          apply(tr, oldState): TypewriterState {
            let newState = { ...oldState };

            // Handle typewriter mode commands
            const meta = tr.getMeta('typewriterMode');
            if (meta) {
              switch (meta.type) {
                case 'toggle':
                  newState.enabled = !newState.enabled;
                  break;
                case 'enable':
                  newState.enabled = true;
                  break;
                case 'disable':
                  newState.enabled = false;
                  break;
                case 'setOffset':
                  newState.scrollOffset = meta.offset;
                  break;
              }
            }

            return newState;
          },
        },

  view(editorView) {
          let scrollTimeout: NodeJS.Timeout | null = null;
          let isScrolling = false;

          const scrollToCursor = () => {
            const state = typewriterKey.getState(editorView.state);
            if (!state?.enabled || isScrolling) return;

            const { state: editorState } = editorView;
            const { selection } = editorState;
            
            // Get cursor position
            const coords = editorView.coordsAtPos(selection.from);
            const editorRect = editorView.dom.getBoundingClientRect();
            
            // Calculate target scroll position (center cursor with offset)
            const viewportHeight = window.innerHeight;
            const cursorRelativeToEditor = coords.top - editorRect.top;
            const targetScrollTop = cursorRelativeToEditor - (viewportHeight / 2) + state.scrollOffset;
            
            // Get scrollable container (could be window or a parent element)
            const scrollContainer = this.findScrollContainer(editorView.dom);
            const currentScroll = scrollContainer === window 
              ? window.scrollY 
              : (scrollContainer as HTMLElement).scrollTop;
              
            const targetScroll = scrollContainer === window
              ? editorRect.top + targetScrollTop + window.scrollY
              : targetScrollTop;

            // Only scroll if there's a significant difference (avoid micro-scrolling)
            if (Math.abs(targetScroll - currentScroll) > 5) {
              isScrolling = true;
              
              if (state.smoothScroll) {
                this.smoothScrollTo(scrollContainer, targetScroll, state.animationDuration, () => {
                  isScrolling = false;
                });
              } else {
                if (scrollContainer === window) {
                  window.scrollTo(0, targetScroll);
                } else {
                  (scrollContainer as HTMLElement).scrollTop = targetScroll;
                }
                isScrolling = false;
              }
            }
          };

          const debouncedScroll = () => {
            if (scrollTimeout) {
              clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(scrollToCursor, 50);
          };

          // Listen to selection changes and document updates
          const handleUpdate = () => {
            const state = typewriterKey.getState(editorView.state);
            if (state?.enabled) {
              debouncedScroll();
            }
          };

          // Add CSS class to editor when typewriter mode is active
          const updateEditorClass = () => {
            const state = typewriterKey.getState(editorView.state);
            if (state?.enabled) {
              editorView.dom.classList.add('typewriter-mode');
            } else {
              editorView.dom.classList.remove('typewriter-mode');
            }
          };

          // Initial setup
          updateEditorClass();

          return {
            update(view, prevState) {
              const prevTypewriterState = typewriterKey.getState(prevState);
              const currentTypewriterState = typewriterKey.getState(view.state);
              
              // Update CSS class if mode changed
              if (prevTypewriterState?.enabled !== currentTypewriterState?.enabled) {
                updateEditorClass();
              }
              
              // Handle cursor movement
              if (view.state.selection.from !== prevState.selection.from) {
                handleUpdate();
              }
            },

            destroy() {
              if (scrollTimeout) {
                clearTimeout(scrollTimeout);
              }
              editorView.dom.classList.remove('typewriter-mode');
            },
          };
        },

        // Helper methods
        findScrollContainer(element: Element): Window | Element {
          let parent = element.parentElement;
          
          while (parent) {
            const style = window.getComputedStyle(parent);
            const overflowY = style.getPropertyValue('overflow-y');
            const overflow = style.getPropertyValue('overflow');
            
            if (overflowY === 'auto' || overflowY === 'scroll' || 
                overflow === 'auto' || overflow === 'scroll') {
              return parent;
            }
            parent = parent.parentElement;
          }
          
          return window;
        },

        smoothScrollTo(container: Window | Element, targetY: number, duration: number, callback?: () => void) {
          const startY = container === window ? window.scrollY : (container as HTMLElement).scrollTop;
          const difference = targetY - startY;
          const startTime = performance.now();

          const animateScroll = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Easing function (easeInOutCubic)
            const easing = progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            const currentY = startY + (difference * easing);
            
            if (container === window) {
              window.scrollTo(0, currentY);
            } else {
              (container as HTMLElement).scrollTop = currentY;
            }

            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            } else if (callback) {
              callback();
            }
          };

          requestAnimationFrame(animateScroll);
        },
      }),
    ];
  },

  addCommands() {
    return {
      toggleTypewriterMode:
        () =>
        ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('typewriterMode', { type: 'toggle' });
            dispatch(tr);
          }
          return true;
        },

      enableTypewriterMode:
        () =>
        ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('typewriterMode', { type: 'enable' });
            dispatch(tr);
          }
          return true;
        },

      disableTypewriterMode:
        () =>
        ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('typewriterMode', { type: 'disable' });
            dispatch(tr);
          }
          return true;
        },

      setTypewriterScrollOffset:
        (offset: number) =>
        ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('typewriterMode', { 
              type: 'setOffset', 
              offset 
            });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
  'Mod-Alt-t': () => (this.editor.commands as any).toggleTypewriterMode(),
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['doc'],
        attributes: {
          'data-typewriter-mode': {
            default: false,
            rendered: false,
          },
        },
      },
    ];
  },
});

// CSS styles for typewriter mode
export const typewriterModeStyles = `
  .typewriter-mode {
    transition: transform 0.2s ease-in-out;
  }
  
  .typewriter-mode .ProseMirror {
    padding-bottom: 50vh; /* Add bottom padding so cursor can be centered */
  }
  
  .typewriter-mode .ProseMirror:focus {
    outline: none;
  }
`;

// Utility function to check if typewriter mode is enabled
export function isTypewriterModeEnabled(editor: any): boolean {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'typewriterMode');
  return plugin?.getState(editor.state)?.enabled || false;
}

export type { TypewriterModeOptions };