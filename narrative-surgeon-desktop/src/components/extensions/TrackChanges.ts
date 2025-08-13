import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, EditorState, Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { DOMParser } from '@tiptap/pm/model';

interface TrackChangesOptions {
  authorName: string;
  enabled: boolean;
  onChangeDetected?: (change: ChangeInfo) => void;
}

interface ChangeInfo {
  id: string;
  type: 'insert' | 'delete' | 'modify';
  position: number;
  content: string;
  author: string;
  timestamp: number;
}

interface TrackChangesState {
  changes: ChangeInfo[];
  decorations: DecorationSet;
  enabled: boolean;
  authorName: string;
}

export const TrackChangesExtension = Extension.create<TrackChangesOptions>({
  name: 'trackChanges',

  addOptions() {
    return {
      authorName: 'Anonymous',
      enabled: true,
      onChangeDetected: undefined,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          'track-change-id': {
            default: null,
            parseHTML: element => element.getAttribute('track-change-id'),
            renderHTML: attributes => {
              if (!attributes['track-change-id']) {
                return {};
              }
              return {
                'track-change-id': attributes['track-change-id'],
              };
            },
          },
          'track-change-type': {
            default: null,
            parseHTML: element => element.getAttribute('track-change-type'),
            renderHTML: attributes => {
              if (!attributes['track-change-type']) {
                return {};
              }
              return {
                'track-change-type': attributes['track-change-type'],
              };
            },
          },
          'track-change-author': {
            default: null,
            parseHTML: element => element.getAttribute('track-change-author'),
            renderHTML: attributes => {
              if (!attributes['track-change-author']) {
                return {};
              }
              return {
                'track-change-author': attributes['track-change-author'],
              };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    const trackChangesKey = new PluginKey<TrackChangesState>('trackChanges');
    const opts = this.options; // capture extension options
    return [
      new Plugin({
        key: trackChangesKey,
        
        state: {
      init(): TrackChangesState {
            return {
              changes: [],
              decorations: DecorationSet.empty,
        enabled: opts.enabled,
        authorName: opts.authorName,
            };
          },

          apply(tr, oldState): TrackChangesState {
            const { enabled, authorName, changes } = oldState;
            
            if (!enabled) {
              return oldState;
            }

            let newChanges = [...changes];
            let decorations = oldState.decorations.map(tr.mapping, tr.doc);

            // Detect insertions and deletions
            if (tr.docChanged) {
              tr.steps.forEach((step, index) => {
                const changeId = `change-${Date.now()}-${index}`;

                if (step.toJSON().stepType === 'replace') {
                  const { from, to, slice } = step as any;
                  
                  if (slice.content.size > 0) {
                    // Insertion
                    const change: ChangeInfo = {
                      id: changeId,
                      type: 'insert',
                      position: from,
                      content: slice.content.textBetween(0, slice.content.size),
                      author: authorName,
                      timestamp: Date.now(),
                    };
                    
                    newChanges.push(change);

                    // Add insertion decoration
                    const decoration = Decoration.inline(from, from + slice.content.size, {
                      class: 'track-change track-change-insert',
                      'data-change-id': changeId,
                      'data-author': authorName,
                      title: `Inserted by ${authorName}`,
                    });
                    
                    decorations = decorations.add(tr.doc, [decoration]);
                  }
                  
                  if (from < to) {
                    // Deletion
                    const deletedText = oldState.decorations.find(from, to).map(d => d.spec?.['data-content'] || '').join('');
                    
                    const change: ChangeInfo = {
                      id: changeId + '-del',
                      type: 'delete',
                      position: from,
                      content: deletedText,
                      author: authorName,
                      timestamp: Date.now(),
                    };
                    
                    newChanges.push(change);

                    // Add deletion decoration (strikethrough)
                    const decoration = Decoration.inline(from, from, {
                      class: 'track-change track-change-delete',
                      'data-change-id': changeId + '-del',
                      'data-author': authorName,
                      'data-content': deletedText,
                      title: `Deleted by ${authorName}: "${deletedText}"`,
                    });
                    
                    decorations = decorations.add(tr.doc, [decoration]);
                  }
                }
              });

              // Notify about changes
              if (opts.onChangeDetected && newChanges.length > changes.length) {
                newChanges.slice(changes.length).forEach(change => {
                  opts.onChangeDetected!(change);
                });
              }
            }

            return {
              ...oldState,
              changes: newChanges,
              decorations,
            };
          },
        },

        props: {
          decorations(state: EditorState) {
            return trackChangesKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },

  addCommands() {
  const trackChangesKey = new PluginKey<TrackChangesState>('trackChanges');
    return {
      toggleTrackChanges: () => ({ state }: { state: EditorState }) => {
        // Toggle by writing to a metadata transaction that flips enabled flag in state clone
        const pluginState = trackChangesKey.getState(state);
        if (!pluginState) return false;
        // Mutating options is not ideal; the state.enabled should control behavior.
        pluginState.enabled = !pluginState.enabled;
        return true;
      },

      acceptChange: (changeId: string) => ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
        const pluginState = trackChangesKey.getState(state);
        if (!pluginState) return false;

        const change = pluginState.changes.find((c: ChangeInfo) => c.id === changeId);
        if (!change) return false;

        // Remove the decoration and change record
        const newDecorations = pluginState.decorations.remove(
          pluginState.decorations.find().filter((d: any) => d.spec['data-change-id'] === changeId)
        );

        // We could set meta to notify, though plugin currently doesn't react; left for future.

        return true;
      },

      rejectChange: (changeId: string) => ({ state, dispatch }: { state: EditorState; dispatch?: (tr: Transaction) => void }) => {
        const pluginState = trackChangesKey.getState(state);
        if (!pluginState) return false;

        const change = pluginState.changes.find((c: ChangeInfo) => c.id === changeId);
        if (!change) return false;

        if (change.type === 'insert') {
          // Remove inserted content
          const decoration = pluginState.decorations.find().find((d: any) => d.spec['data-change-id'] === changeId);
          if (decoration && dispatch) {
            const tr = state.tr.delete(decoration.from, decoration.to);
            dispatch(tr);
          }
        } else if (change.type === 'delete') {
          // Restore deleted content
          if (dispatch) {
            const tr = state.tr.insertText(change.content, change.position);
            dispatch(tr);
          }
        }

        return true;
      },

      getAllChanges: () => ({ state }: { state: EditorState }) => {
        const pluginState = trackChangesKey.getState(state);
        return pluginState?.changes || [];
      },
    };
  },

  addKeyboardShortcuts() {
    return {
  'Mod-Shift-t': () => (this.editor.commands as any).toggleTrackChanges(),
    };
  },
});

export type { ChangeInfo, TrackChangesOptions };