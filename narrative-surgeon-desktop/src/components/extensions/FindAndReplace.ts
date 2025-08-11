import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findWrapping } from '@tiptap/pm/transform';

interface FindAndReplaceOptions {
  searchResultClass: string;
  searchResultActiveClass: string;
  caseSensitive: boolean;
  useRegex: boolean;
  onSearchUpdate?: (results: SearchResult[]) => void;
}

interface SearchResult {
  from: number;
  to: number;
  match: string;
  index: number;
}

interface FindAndReplaceState {
  searchTerm: string;
  replaceTerm: string;
  results: SearchResult[];
  currentIndex: number;
  decorations: DecorationSet;
  isActive: boolean;
  caseSensitive: boolean;
  useRegex: boolean;
  replaceAll: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findAndReplace: {
      /**
       * Start find and replace mode
       */
      startFindAndReplace: () => ReturnType;
      /**
       * Stop find and replace mode
       */
      stopFindAndReplace: () => ReturnType;
      /**
       * Set the search term
       */
      setSearchTerm: (searchTerm: string) => ReturnType;
      /**
       * Set the replace term
       */
      setReplaceTerm: (replaceTerm: string) => ReturnType;
      /**
       * Find next occurrence
       */
      findNext: () => ReturnType;
      /**
       * Find previous occurrence
       */
      findPrevious: () => ReturnType;
      /**
       * Replace current occurrence
       */
      replace: () => ReturnType;
      /**
       * Replace all occurrences
       */
      replaceAll: () => ReturnType;
      /**
       * Toggle case sensitivity
       */
      toggleCaseSensitive: () => ReturnType;
      /**
       * Toggle regex mode
       */
      toggleRegex: () => ReturnType;
    };
  }
}

export const FindAndReplaceExtension = Extension.create<FindAndReplaceOptions>({
  name: 'findAndReplace',

  addOptions() {
    return {
      searchResultClass: 'search-result',
      searchResultActiveClass: 'search-result-active',
      caseSensitive: false,
      useRegex: false,
      onSearchUpdate: undefined,
    };
  },

  addStorage() {
    return {
      isActive: false,
      searchTerm: '',
      replaceTerm: '',
      currentIndex: -1,
      results: [],
      caseSensitive: this.options.caseSensitive,
      useRegex: this.options.useRegex,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('findAndReplace'),
        
        state: {
          init(): FindAndReplaceState {
            return {
              searchTerm: '',
              replaceTerm: '',
              results: [],
              currentIndex: -1,
              decorations: DecorationSet.empty,
              isActive: false,
              caseSensitive: this.options.caseSensitive || false,
              useRegex: this.options.useRegex || false,
              replaceAll: false,
            };
          },

          apply(tr, oldState): FindAndReplaceState {
            let newState = { ...oldState };
            newState.decorations = oldState.decorations.map(tr.mapping, tr.doc);

            // Handle find and replace commands
            const meta = tr.getMeta('findAndReplace');
            if (meta) {
              switch (meta.type) {
                case 'start':
                  newState.isActive = true;
                  break;

                case 'stop':
                  newState.isActive = false;
                  newState.searchTerm = '';
                  newState.replaceTerm = '';
                  newState.results = [];
                  newState.currentIndex = -1;
                  newState.decorations = DecorationSet.empty;
                  break;

                case 'search':
                  newState.searchTerm = meta.searchTerm;
                  newState.results = this.findMatches(
                    tr.doc,
                    meta.searchTerm,
                    newState.caseSensitive,
                    newState.useRegex
                  );
                  newState.currentIndex = newState.results.length > 0 ? 0 : -1;
                  newState.decorations = this.createDecorations(
                    tr.doc,
                    newState.results,
                    newState.currentIndex
                  );
                  
                  // Notify parent component of search results
                  if (this.options.onSearchUpdate) {
                    this.options.onSearchUpdate(newState.results);
                  }
                  break;

                case 'replace-term':
                  newState.replaceTerm = meta.replaceTerm;
                  break;

                case 'next':
                  if (newState.results.length > 0) {
                    newState.currentIndex = (newState.currentIndex + 1) % newState.results.length;
                    newState.decorations = this.createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex
                    );
                  }
                  break;

                case 'previous':
                  if (newState.results.length > 0) {
                    newState.currentIndex = newState.currentIndex <= 0 
                      ? newState.results.length - 1 
                      : newState.currentIndex - 1;
                    newState.decorations = this.createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex
                    );
                  }
                  break;

                case 'toggle-case':
                  newState.caseSensitive = !newState.caseSensitive;
                  if (newState.searchTerm) {
                    newState.results = this.findMatches(
                      tr.doc,
                      newState.searchTerm,
                      newState.caseSensitive,
                      newState.useRegex
                    );
                    newState.currentIndex = newState.results.length > 0 ? 0 : -1;
                    newState.decorations = this.createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex
                    );
                  }
                  break;

                case 'toggle-regex':
                  newState.useRegex = !newState.useRegex;
                  if (newState.searchTerm) {
                    newState.results = this.findMatches(
                      tr.doc,
                      newState.searchTerm,
                      newState.caseSensitive,
                      newState.useRegex
                    );
                    newState.currentIndex = newState.results.length > 0 ? 0 : -1;
                    newState.decorations = this.createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex
                    );
                  }
                  break;
              }
            }

            return newState;
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)?.decorations;
          },
        },

        // Helper methods
        findMatches(doc: any, searchTerm: string, caseSensitive: boolean, useRegex: boolean): SearchResult[] {
          if (!searchTerm) return [];

          const results: SearchResult[] = [];
          const text = doc.textContent;
          
          try {
            if (useRegex) {
              const flags = caseSensitive ? 'g' : 'gi';
              const regex = new RegExp(searchTerm, flags);
              let match;
              
              while ((match = regex.exec(text)) !== null) {
                // Find document position for text offset
                const pos = this.textOffsetToPos(doc, match.index);
                if (pos !== null) {
                  results.push({
                    from: pos,
                    to: pos + match[0].length,
                    match: match[0],
                    index: results.length,
                  });
                }
                
                // Prevent infinite loop on zero-width matches
                if (match[0].length === 0) {
                  regex.lastIndex++;
                }
              }
            } else {
              const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();
              const targetText = caseSensitive ? text : text.toLowerCase();
              
              let index = 0;
              while ((index = targetText.indexOf(searchText, index)) !== -1) {
                const pos = this.textOffsetToPos(doc, index);
                if (pos !== null) {
                  results.push({
                    from: pos,
                    to: pos + searchTerm.length,
                    match: text.substr(index, searchTerm.length),
                    index: results.length,
                  });
                }
                index += searchTerm.length;
              }
            }
          } catch (error) {
            // Invalid regex - return empty results
            console.warn('Invalid search pattern:', error);
            return [];
          }

          return results;
        },

        textOffsetToPos(doc: any, offset: number): number | null {
          let pos = 0;
          let currentOffset = 0;

          const findPos = (node: any, nodePos: number): number | null => {
            if (node.isText) {
              if (currentOffset + node.text.length > offset) {
                return nodePos + (offset - currentOffset);
              }
              currentOffset += node.text.length;
            } else if (node.isLeaf) {
              // Skip leaf nodes like images
            } else {
              for (let i = 0; i < node.content.childCount; i++) {
                const child = node.content.child(i);
                const result = findPos(child, nodePos + 1);
                if (result !== null) return result;
                nodePos += child.nodeSize;
              }
            }
            return null;
          };

          return findPos(doc, 0);
        },

        createDecorations(doc: any, results: SearchResult[], currentIndex: number): DecorationSet {
          const decorations: Decoration[] = results.map((result, index) => {
            const className = index === currentIndex 
              ? `${this.options.searchResultClass} ${this.options.searchResultActiveClass}`
              : this.options.searchResultClass;
              
            return Decoration.inline(result.from, result.to, {
              class: className,
            });
          });

          return DecorationSet.create(doc, decorations);
        },
      }),
    ];
  },

  addCommands() {
    return {
      startFindAndReplace:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'start' });
            dispatch(tr);
          }
          return true;
        },

      stopFindAndReplace:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'stop' });
            dispatch(tr);
          }
          return true;
        },

      setSearchTerm:
        (searchTerm: string) =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', {
              type: 'search',
              searchTerm,
            });
            dispatch(tr);
          }
          return true;
        },

      setReplaceTerm:
        (replaceTerm: string) =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', {
              type: 'replace-term',
              replaceTerm,
            });
            dispatch(tr);
          }
          return true;
        },

      findNext:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'next' });
            dispatch(tr);
          }
          return true;
        },

      findPrevious:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'previous' });
            dispatch(tr);
          }
          return true;
        },

      replace:
        () =>
        ({ dispatch, state, view }) => {
          const pluginState = state.plugins
            .find(p => p.key.name === 'findAndReplace')
            ?.getState(state);
          
          if (!pluginState || pluginState.currentIndex === -1) return false;
          
          const currentResult = pluginState.results[pluginState.currentIndex];
          if (!currentResult) return false;

          if (dispatch) {
            const tr = state.tr.replaceWith(
              currentResult.from,
              currentResult.to,
              state.schema.text(pluginState.replaceTerm)
            );
            
            // Update search after replacement
            tr.setMeta('findAndReplace', {
              type: 'search',
              searchTerm: pluginState.searchTerm,
            });
            
            dispatch(tr);
          }
          
          return true;
        },

      replaceAll:
        () =>
        ({ dispatch, state }) => {
          const pluginState = state.plugins
            .find(p => p.key.name === 'findAndReplace')
            ?.getState(state);
          
          if (!pluginState || pluginState.results.length === 0) return false;

          if (dispatch) {
            let tr = state.tr;
            
            // Replace all occurrences from end to start to maintain positions
            const sortedResults = [...pluginState.results].reverse();
            
            sortedResults.forEach(result => {
              tr = tr.replaceWith(
                result.from,
                result.to,
                state.schema.text(pluginState.replaceTerm)
              );
            });
            
            // Clear search after replace all
            tr.setMeta('findAndReplace', { type: 'stop' });
            dispatch(tr);
          }
          
          return true;
        },

      toggleCaseSensitive:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'toggle-case' });
            dispatch(tr);
          }
          return true;
        },

      toggleRegex:
        () =>
        ({ dispatch, state }) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'toggle-regex' });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-f': () => this.editor.commands.startFindAndReplace(),
      'Mod-h': () => this.editor.commands.startFindAndReplace(),
      'Escape': () => this.editor.commands.stopFindAndReplace(),
      'Enter': () => this.editor.commands.findNext(),
      'Shift-Enter': () => this.editor.commands.findPrevious(),
      'Mod-Enter': () => this.editor.commands.replace(),
      'Mod-Shift-Enter': () => this.editor.commands.replaceAll(),
    };
  },
});

// Utility functions to get search state
export function getSearchResults(editor: any): SearchResult[] {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'findAndReplace');
  return plugin?.getState(editor.state)?.results || [];
}

export function getCurrentSearchIndex(editor: any): number {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'findAndReplace');
  return plugin?.getState(editor.state)?.currentIndex || -1;
}

export function isSearchActive(editor: any): boolean {
  const plugin = editor.state.plugins.find((p: any) => p.key.name === 'findAndReplace');
  return plugin?.getState(editor.state)?.isActive || false;
}

export type { SearchResult, FindAndReplaceOptions };