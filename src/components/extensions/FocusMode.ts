import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, EditorState, Transaction } from '@tiptap/pm/state';
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

// Command interface augmentation moved to central ambient.d.ts

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
    // Helper utilities defined once and reused
    const findSentenceBounds = (doc: any, pos: number): { sentenceStart: number; sentenceEnd: number } => {
      let sentenceStart = pos;
      let sentenceEnd = pos;
      const text = doc.textContent as string;
      // Backward scan
      let currentPos = pos;
      while (currentPos > 0) {
        const char = text[currentPos - 1];
        if (/[.!?]/.test(char)) {
          const nextChar = text[currentPos];
          if (!nextChar || /\s/.test(nextChar)) break;
        }
        currentPos--;
      }
      sentenceStart = Math.max(0, currentPos);
      // Forward scan
      currentPos = pos;
      while (currentPos < text.length) {
        const char = text[currentPos];
        if (/[.!?]/.test(char)) {
          const nextChar = text[currentPos + 1];
          if (!nextChar || /\s/.test(nextChar)) {
            currentPos++;
            while (currentPos < text.length && /\s/.test(text[currentPos])) currentPos++;
            break;
          }
        }
        currentPos++;
      }
      sentenceEnd = Math.min(text.length, currentPos);
      return { sentenceStart, sentenceEnd };
    };

    const findParagraphBounds = (doc: any, pos: number): { paragraphStart: number; paragraphEnd: number } => {
      let paragraphStart = 0;
      let paragraphEnd = doc.content.size;
      doc.descendants((node: any, nodePos: number) => {
        if (node.type.name === 'paragraph') {
          const nodeStart = nodePos;
          const nodeEnd = nodePos + node.nodeSize;
          if (pos >= nodeStart && pos <= nodeEnd) {
            paragraphStart = nodeStart;
            paragraphEnd = nodeEnd;
            return false;
          }
        }
        return undefined;
      });
      return { paragraphStart, paragraphEnd };
    };

  const addFadeDecorations = (_doc: any, decorations: Decoration[], from: number, to: number, fadeOpacity: number, animationDuration: number) => {
      if (from >= to) return;
      decorations.push(
        Decoration.inline(from, to, {
          class: 'focus-fade',
          style: `opacity: ${fadeOpacity}; transition: opacity ${animationDuration}ms ease;`,
        })
      );
    };

    const createFocusDecorations = (doc: any, cursorPos: number, focusOnSentence: boolean, fadeOpacity: number, animationDuration: number): DecorationSet => {
      const decorations: Decoration[] = [];
      if (focusOnSentence) {
        const { sentenceStart, sentenceEnd } = findSentenceBounds(doc, cursorPos);
        addFadeDecorations(doc, decorations, 0, sentenceStart, fadeOpacity, animationDuration);
        addFadeDecorations(doc, decorations, sentenceEnd, doc.content.size, fadeOpacity, animationDuration);
        if (sentenceStart < sentenceEnd) {
          decorations.push(
            Decoration.inline(sentenceStart, sentenceEnd, {
              class: 'focus-highlight focus-sentence',
              style: `transition: all ${animationDuration}ms ease;`,
            })
          );
        }
      } else {
        const { paragraphStart, paragraphEnd } = findParagraphBounds(doc, cursorPos);
        addFadeDecorations(doc, decorations, 0, paragraphStart, fadeOpacity, animationDuration);
        addFadeDecorations(doc, decorations, paragraphEnd, doc.content.size, fadeOpacity, animationDuration);
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
    };

    const focusModeKey = new PluginKey<FocusModeState>('focusMode');
    return [
      new Plugin({
        key: focusModeKey,
        state: {
          init: (): FocusModeState => ({
            enabled: this.options.enabled || false,
            focusPosition: 0,
            decorations: DecorationSet.empty,
            fadeOpacity: this.options.fadeOpacity || 0.3,
            focusOnSentence: this.options.focusOnSentence || false,
            animationDuration: this.options.animationDuration || 200,
          }),
          apply: (tr, oldState: FocusModeState): FocusModeState => {
            const meta = tr.getMeta('focusMode');
            const decorations = oldState.decorations.map(tr.mapping, tr.doc);
            let next: FocusModeState = { ...oldState, decorations };
            if (meta) {
              switch (meta.type) {
                case 'toggle':
                  next.enabled = !next.enabled; break;
                case 'enable':
                  next.enabled = true; break;
                case 'disable':
                  next.enabled = false; next.decorations = DecorationSet.empty; return next;
                case 'toggleUnit':
                  next.focusOnSentence = !next.focusOnSentence; break;
                case 'setOpacity':
                  next.fadeOpacity = Math.max(0, Math.min(1, meta.opacity)); break;
              }
            }
            if (next.enabled && (tr.selectionSet || meta)) {
              const { from } = tr.selection;
              next.focusPosition = from;
              next.decorations = createFocusDecorations(
                tr.doc,
                from,
                next.focusOnSentence,
                next.fadeOpacity,
                next.animationDuration
              );
            }
            return next;
          }
        },
        props: {
          decorations: (state: EditorState) => (this as any).getState(state)?.decorations,
        },
        view: (editorView) => {
          const updateEditorClass = () => {
            const pluginState: FocusModeState | undefined = focusModeKey.getState(editorView.state);
            if (pluginState?.enabled) editorView.dom.classList.add('focus-mode');
            else editorView.dom.classList.remove('focus-mode');
          };
          updateEditorClass();
          return {
            update: () => updateEditorClass(),
            destroy: () => editorView.dom.classList.remove('focus-mode')
          };
        }
      })
    ];
  },

  addCommands() {
    return {
      toggleFocusMode:
        () =>
        ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'toggle' });
            dispatch(tr);
          }
          return true;
        },

      enableFocusMode:
        () =>
  ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'enable' });
            dispatch(tr);
          }
          return true;
        },

      disableFocusMode:
        () =>
  ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'disable' });
            dispatch(tr);
          }
          return true;
        },

      toggleFocusUnit:
        () =>
  ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('focusMode', { type: 'toggleUnit' });
            dispatch(tr);
          }
          return true;
        },

      setFocusOpacity:
        (opacity: number) =>
  ({ dispatch, state }: { dispatch: (tr: Transaction) => void; state: EditorState }) => {
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
  'Mod-Alt-f': () => (this.editor.commands as any).toggleFocusMode(),
  'Mod-Alt-Shift-f': () => (this.editor.commands as any).toggleFocusUnit(),
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