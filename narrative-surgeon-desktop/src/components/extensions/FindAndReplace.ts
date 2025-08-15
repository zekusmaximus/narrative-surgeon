import { Extension, type CommandProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

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

// Command augmentation centralized in ambient.d.ts

function textOffsetToPos(doc: any, offset: number): number | null {
  let pos: number | null = null;
  let currentOffset = 0;

  doc.descendants((node: any, nodePos: number) => {
    if (node.isText) {
      if (pos === null && currentOffset + node.textContent.length >= offset) {
        pos = nodePos + (offset - currentOffset);
      }
      currentOffset += node.textContent.length;
    } else {
      currentOffset += 1; // for the opening tag
    }
    if (pos !== null) {
      return false; // stop recursing
    }
    return;
  });
  return pos;
}

function findMatches(doc: any, searchTerm: string, caseSensitive: boolean, useRegex: boolean): SearchResult[] {
  if (!searchTerm) return [];

  const results: SearchResult[] = [];
  const text = doc.textContent;
  
  try {
    if (useRegex) {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(searchTerm, flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const pos = textOffsetToPos(doc, match.index);
        if (pos !== null) {
          results.push({
            from: pos,
            to: pos + match[0].length,
            match: match[0],
            index: results.length,
          });
        }
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    } else {
      const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();
      const targetText = caseSensitive ? text : text.toLowerCase();
      let index = 0;
      while ((index = targetText.indexOf(searchText, index)) !== -1) {
        const pos = textOffsetToPos(doc, index);
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
    console.warn('Invalid search pattern:', error);
    return [];
  }

  return results;
}

function createDecorations(doc: any, results: SearchResult[], currentIndex: number, options: FindAndReplaceOptions): DecorationSet {
  const decorations: Decoration[] = results.map((result, index) => {
    const className = index === currentIndex 
      ? `${options.searchResultClass} ${options.searchResultActiveClass}`
      : options.searchResultClass;
      
    return Decoration.inline(result.from, result.to, {
      class: className,
    });
  });

  return DecorationSet.create(doc, decorations);
}


const findAndReplaceKey = new PluginKey<FindAndReplaceState>('findAndReplace');

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
    const self = this;
    
  return [
      new Plugin({
        key: findAndReplaceKey,
        
        state: {
          init(): FindAndReplaceState {
            return {
              searchTerm: '',
              replaceTerm: '',
              results: [],
              currentIndex: -1,
              decorations: DecorationSet.empty,
              isActive: false,
              caseSensitive: self.options.caseSensitive,
              useRegex: self.options.useRegex,
              replaceAll: false,
            };
          },

          apply(tr, oldState): FindAndReplaceState {
            let newState = { ...oldState };
            newState.decorations = oldState.decorations.map(tr.mapping, tr.doc);

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
                  newState.results = findMatches(
                    tr.doc,
                    meta.searchTerm,
                    newState.caseSensitive,
                    newState.useRegex
                  );
                  newState.currentIndex = newState.results.length > 0 ? 0 : -1;
                  newState.decorations = createDecorations(
                    tr.doc,
                    newState.results,
                    newState.currentIndex,
                    self.options
                  );
                  
                  if (self.options.onSearchUpdate) {
                    self.options.onSearchUpdate(newState.results);
                  }
                  break;

                case 'replace-term':
                  newState.replaceTerm = meta.replaceTerm;
                  break;

                case 'next':
                  if (newState.results.length > 0) {
                    newState.currentIndex = (newState.currentIndex + 1) % newState.results.length;
                    newState.decorations = createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex,
                      self.options
                    );
                  }
                  break;

                case 'previous':
                  if (newState.results.length > 0) {
                    newState.currentIndex = newState.currentIndex <= 0 
                      ? newState.results.length - 1 
                      : newState.currentIndex - 1;
                    newState.decorations = createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex,
                      self.options
                    );
                  }
                  break;

                case 'toggle-case':
                  newState.caseSensitive = !newState.caseSensitive;
                  if (newState.searchTerm) {
                    newState.results = findMatches(
                      tr.doc,
                      newState.searchTerm,
                      newState.caseSensitive,
                      newState.useRegex
                    );
                    newState.currentIndex = newState.results.length > 0 ? 0 : -1;
                    newState.decorations = createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex,
                      self.options
                    );
                  }
                  break;

                case 'toggle-regex':
                  newState.useRegex = !newState.useRegex;
                  if (newState.searchTerm) {
                    newState.results = findMatches(
                      tr.doc,
                      newState.searchTerm,
                      newState.caseSensitive,
                      newState.useRegex
                    );
                    newState.currentIndex = newState.results.length > 0 ? 0 : -1;
                    newState.decorations = createDecorations(
                      tr.doc,
                      newState.results,
                      newState.currentIndex,
                      self.options
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
            const pluginState: FindAndReplaceState | undefined = this.getState(state);
            return pluginState?.decorations;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      startFindAndReplace:
        () =>
        ({ dispatch, state }: CommandProps) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'start' });
            dispatch(tr);
          }
          return true;
        },

      stopFindAndReplace:
        () =>
        ({ dispatch, state }: CommandProps) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'stop' });
            dispatch(tr);
          }
          return true;
        },

      setSearchTerm:
        (searchTerm: string) =>
        ({ dispatch, state }: CommandProps) => {
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
        ({ dispatch, state }: CommandProps) => {
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
        ({ dispatch, state }: CommandProps) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'next' });
            dispatch(tr);
          }
          return true;
        },

      findPrevious:
        () =>
        ({ dispatch, state }: CommandProps) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'previous' });
            dispatch(tr);
          }
          return true;
        },

      replace:
        () =>
        ({ dispatch, state }: CommandProps) => {
          const pluginState = findAndReplaceKey.getState(state);
          
          if (!pluginState || pluginState.currentIndex === -1) return false;
          
          const currentResult = pluginState.results[pluginState.currentIndex];
          if (!currentResult) return false;

          if (dispatch) {
            const tr = state.tr.replaceWith(
              currentResult.from,
              currentResult.to,
              state.schema.text(pluginState.replaceTerm)
            );
            
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
        ({ dispatch, state }: CommandProps) => {
          const pluginState = findAndReplaceKey.getState(state);
          
          if (!pluginState || pluginState.results.length === 0) return false;

          if (dispatch) {
            let tr = state.tr;
            
            const sortedResults = [...pluginState.results].reverse();
            
            sortedResults.forEach(result => {
              tr = tr.replaceWith(
                result.from,
                result.to,
                state.schema.text(pluginState.replaceTerm)
              );
            });
            
            tr.setMeta('findAndReplace', { type: 'stop' });
            dispatch(tr);
          }
          
          return true;
        },

      toggleCaseSensitive:
        () =>
        ({ dispatch, state }: CommandProps) => {
          if (dispatch) {
            const tr = state.tr.setMeta('findAndReplace', { type: 'toggle-case' });
            dispatch(tr);
          }
          return true;
        },

      toggleRegex:
        () =>
        ({ dispatch, state }: CommandProps) => {
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
  'Mod-f': () => (this.editor.commands as any).startFindAndReplace(),
  'Mod-h': () => (this.editor.commands as any).startFindAndReplace(),
  'Escape': () => (this.editor.commands as any).stopFindAndReplace(),
  'Enter': () => (this.editor.commands as any).findNext(),
  'Shift-Enter': () => (this.editor.commands as any).findPrevious(),
  'Mod-Enter': () => (this.editor.commands as any).replace(),
  'Mod-Shift-Enter': () => (this.editor.commands as any).replaceAll(),
    };
  },
});

export function getSearchResults(editor: any): SearchResult[] {
  const pluginState: FindAndReplaceState | undefined = editor.state.plugins
    .map((p: Plugin) => (p as any).key === findAndReplaceKey ? findAndReplaceKey.getState(editor.state) : undefined)
    .find(Boolean);
  return pluginState?.results || [];
}

export function getCurrentSearchIndex(editor: any): number {
  const state = findAndReplaceKey.getState(editor.state) as FindAndReplaceState | undefined;
  return state?.currentIndex ?? -1;
}

export function isSearchActive(editor: any): boolean {
  return !!findAndReplaceKey.getState(editor.state)?.isActive;
}

export type { SearchResult, FindAndReplaceOptions };