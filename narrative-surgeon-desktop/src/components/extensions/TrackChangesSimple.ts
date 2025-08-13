import { Extension, Commands } from '@tiptap/core';

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


  addCommands() {
    return {
      toggleTrackChanges: () => ({ commands }: { commands: Commands<any> }) => {
        return commands.toggleNode('trackChangesSimple', 'paragraph');
      },
    };
  },

  addKeyboardShortcuts() {
    return {
  'Mod-Shift-t': () => (this.editor.commands as any).toggleTrackChanges(),
    };
  },
});

export type { ChangeInfo };