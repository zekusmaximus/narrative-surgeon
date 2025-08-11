import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface TrackChangesOptions {
  enabled: boolean;
}

interface ChangeInfo {
  id: string;
  type: 'insert' | 'delete';
  from: number;
  to: number;
  text: string;
  timestamp: number;
}

export const TrackChangesSimple = Extension.create<TrackChangesOptions>({
  name: 'trackChangesSimple',

  addOptions() {
    return {
      enabled: false,
    };
  },

  addCommands() {
    return {
      toggleTrackChanges: () => () => {
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-t': () => this.editor.commands.toggleTrackChanges(),
    };
  },
});

export type { ChangeInfo };