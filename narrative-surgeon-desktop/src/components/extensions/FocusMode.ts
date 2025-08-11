import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface FocusModeOptions {
  enabled: boolean;
  fadeOpacity: number; // Opacity for non-focused content (0-1)
  focusOnSentence: boolean; // Focus on sentence instead of paragraph
  animationDuration: number; // CSS transition duration in milliseconds
}

interface FocusModeState {
  enabled: boolean;
  focusPosition: number;
  decorations: DecorationSet;
  fadeOpacity: number;
  focusOnSentence: boolean;
  animationDuration: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    focusMode: {
      /**
       * Toggle focus mode on/off
       */
      toggleFocusMode: () => ReturnType;
      /**
       * Enable focus mode
       */
      enableFocusMode: () => ReturnType;
      /**
       * Disable focus mode
       */
      disableFocusMode: () => ReturnType;
      /**
       * Toggle between paragraph and sentence focus
       */
      toggleFocusUnit: () => ReturnType;
      /**
       * Set focus opacity
       */
      setFocusOpacity: (opacity: number) => ReturnType;
    };
  }
}

export const FocusModeExtension = Extension.create<FocusModeOptions>({
  name: 'focusMode',

  addOptions() {
    return {
      enabled: false,
      fadeOpacity: 0.3,
      focusOnSentence: false,
      animationDuration: 200,
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
      fadeOpacity: this.options.fadeOpacity,
      focusOnSentence: this.options.focusOnSentence,
      animationDuration: this.options.animationDuration,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('focusMode'),
        
        state: {
          init(): FocusModeState {
            return {
              enabled: this.options.enabled || false,
              focusPosition: 0,
              decorations: DecorationSet.empty,
              fadeOpacity: this.options.fadeOpacity || 0.3,
              focusOnSentence: this.options.focusOnSentence || false,
              animationDuration: this.options.animationDuration || 200,
            };
          },

          apply(tr, oldState): FocusModeState {
            let newState = { ...oldState };
            
            // Map decorations through document changes
            newState.decorations = oldState.decorations.map(tr.mapping, tr.doc);

            // Handle focus mode commands
            const meta = tr.getMeta('focusMode');
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
                  newState.decorations = DecorationSet.empty;
                  return newState;
                case 'toggleUnit':
                  newState.focusOnSentence = !newState.focusOnSentence;
                  break;
                case 'setOpacity':
                  newState.fadeOpacity = Math.max(0, Math.min(1, meta.opacity));
                  break;
              }
            }

            // Update focus area based on cursor position
            if (newState.enabled && (tr.selectionSet || meta)) {
              const { from } = tr.selection;
              newState.focusPosition = from;
              newState.decorations = this.createFocusDecorations(
                tr.doc,
                from,
                newState.focusOnSentence,
                newState.fadeOpacity,
                newState.animationDuration
              );
            }

            return newState;
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)?.decorations;
          },
        },

        view(editorView) {
          // Add CSS class to editor when focus mode is active
          const updateEditorClass = () => {
            const state = this.getState(editorView.state);
            if (state?.enabled) {
              editorView.dom.classList.add('focus-mode');
            } else {
              editorView.dom.classList.remove('focus-mode');
            }
          };

          // Initial setup
          updateEditorClass();

          return {
            update(view, prevState) {
              const prevFocusState = this.getState(prevState);
              const currentFocusState = this.getState(view.state);
              
              // Update CSS class if mode changed
              if (prevFocusState?.enabled !== currentFocusState?.enabled) {
                updateEditorClass();
              }
            },

            destroy() {
              editorView.dom.classList.remove('focus-mode');
            },
          };
        },

        // Helper method to create focus decorations
        createFocusDecorations(doc: any, cursorPos: number, focusOnSentence: boolean, fadeOpacity: number, animationDuration: number): DecorationSet {
          const decorations: Decoration[] = [];
          
          if (focusOnSentence) {
            // Find the current sentence boundaries
            const { sentenceStart, sentenceEnd } = this.findSentenceBounds(doc, cursorPos);
            
            // Add fade decorations for all text except current sentence
            this.addFadeDecorations(doc, decorations, 0, sentenceStart, fadeOpacity, animationDuration);
            this.addFadeDecorations(doc, decorations, sentenceEnd, doc.content.size, fadeOpacity, animationDuration);
            
            // Add highlight decoration for current sentence
            if (sentenceStart < sentenceEnd) {
              decorations.push(
                Decoration.inline(sentenceStart, sentenceEnd, {
                  class: 'focus-highlight focus-sentence',
                  style: `transition: all ${animationDuration}ms ease;`,
                })
              );
            }
          } else {
            // Find the current paragraph boundaries
            const { paragraphStart, paragraphEnd } = this.findParagraphBounds(doc, cursorPos);
            
            // Add fade decorations for all text except current paragraph
            this.addFadeDecorations(doc, decorations, 0, paragraphStart, fadeOpacity, animationDuration);
            this.addFadeDecorations(doc, decorations, paragraphEnd, doc.content.size, fadeOpacity, animationDuration);
            
            // Add highlight decoration for current paragraph
            if (paragraphStart < paragraphEnd) {
              decorations.push(
                Decoration.inline(paragraphStart, paragraphEnd, {
                  class: 'focus-highlight focus-paragraph',
                  style: `transition: all ${animationDuration}ms ease;`,
                })
              );
            }
          }

          return DecorationSet.create(doc, decorations);
        },

        findSentenceBounds(doc: any, pos: number): { sentenceStart: number, sentenceEnd: number } {
          let sentenceStart = pos;
          let sentenceEnd = pos;
          
          const text = doc.textContent;
          const sentenceEnders = /[.!?]+\s/g;
          
          // Find sentence start (work backwards from cursor)
          let currentPos = pos;
          while (currentPos > 0) {
            const char = text[currentPos - 1];
            if (/[.!?]/.test(char)) {
              // Check if this is actually a sentence end by looking for following whitespace
              const nextChar = text[currentPos];
              if (/\s/.test(nextChar) || currentPos === text.length) {
                break;
              }
            }
            currentPos--;
          }
          sentenceStart = Math.max(0, currentPos);
          
          // Find sentence end (work forwards from cursor)
          currentPos = pos;
          while (currentPos < text.length) {
            const char = text[currentPos];
            if (/[.!?]/.test(char)) {
              // Look ahead for whitespace or end of text
              const nextChar = text[currentPos + 1];
              if (!nextChar || /\s/.test(nextChar)) {
                currentPos++;
                // Skip any additional whitespace
                while (currentPos < text.length && /\s/.test(text[currentPos])) {
                  currentPos++;
                }
                break;
              }
            }
            currentPos++;
          }
          sentenceEnd = Math.min(text.length, currentPos);
          
          return { sentenceStart, sentenceEnd };
        },

        findParagraphBounds(doc: any, pos: number): { paragraphStart: number, paragraphEnd: number } {
          let paragraphStart = 0;
          let paragraphEnd = doc.content.size;
          let currentPos = 0;

          // Traverse document to find paragraph containing cursor position
          doc.descendants((node: any, nodePos: number) => {
            if (node.type.name === 'paragraph') {
              const nodeStart = nodePos;
              const nodeEnd = nodePos + node.nodeSize;
              
              if (pos >= nodeStart && pos <= nodeEnd) {
                paragraphStart = nodeStart;
                paragraphEnd = nodeEnd;
                return false; // Stop traversing
              }
            }
          });

          return { paragraphStart, paragraphEnd };
        },

        addFadeDecorations(doc: any, decorations: Decoration[], from: number, to: number, fadeOpacity: number, animationDuration: number) {
          if (from >= to) return;
          
          decorations.push(
            Decoration.inline(from, to, {
              class: 'focus-fade',
              style: `opacity: ${fadeOpacity}; transition: opacity ${animationDuration}ms ease;`,
            })
          );
        },
      }),
    ];
  },

  addCommands() {
    return {
      toggleFocusMode:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'toggle' });
            dispatch(tr);
          }
          return true;
        },

      enableFocusMode:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'enable' });
            dispatch(tr);
          }
          return true;
        },

      disableFocusMode:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'disable' });
            dispatch(tr);
          }
          return true;
        },

      toggleFocusUnit:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'toggleUnit' });
            dispatch(tr);
          }
          return true;
        },

      setFocusOpacity:
        (opacity: number) =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { 
              type: 'setOpacity', 
              opacity 
            });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-f': () => this.editor.commands.toggleFocusMode(),
      'Mod-Alt-Shift-f': () => this.editor.commands.toggleFocusUnit(),
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['doc'],
        attributes: {
          'data-focus-mode': {
            default: false,
            rendered: false,
          },
        },
      },
    ];
  },
});

// CSS styles for focus mode
export const focusModeStyles = `
  .focus-mode .ProseMirror {
    position: relative;
  }
  
  .focus-fade {
    pointer-events: none;
  }
  
  .focus-highlight {
    background-color: transparent;
    position: relative;
  }
  
  .focus-sentence {
    /* Optional: subtle highlighting for focused sentence */
  }
  
  .focus-paragraph {
    /* Optional: subtle highlighting for focused paragraph */
  }
  
  /* Dark mode support */
  .dark .focus-fade {
    opacity: 0.4;
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .focus-fade {
      opacity: 0.6;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .focus-fade,
    .focus-highlight {
      transition: none !important;
    }
  }
`;

// Utility functions
export function isFocusModeEnabled(editor: any): boolean {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'focusMode');
  return plugin?.getState(editor.state)?.enabled || false;
}

export function isFocusOnSentence(editor: any): boolean {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'focusMode');
  return plugin?.getState(editor.state)?.focusOnSentence || false;
}

export function getFocusOpacity(editor: any): number {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'focusMode');
  return plugin?.getState(editor.state)?.fadeOpacity || 0.3;
}

export type { FocusModeOptions };