import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Manuscript, Scene, Character, RevisionNote } from '../types';

interface ManuscriptStore {
  // State
  manuscripts: Manuscript[];
  activeManuscript: Manuscript | null;
  scenes: Map<string, Scene[]>;
  characters: Map<string, Character[]>;
  revisionNotes: Map<string, RevisionNote[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  loadManuscripts: () => Promise<void>;
  loadManuscriptData: (manuscriptId: string) => Promise<void>;
  setActiveManuscript: (manuscript: Manuscript | null) => void;
  
  // Manuscript operations
  createManuscript: (title: string, text: string, metadata?: Partial<Manuscript>) => Promise<Manuscript>;
  updateManuscript: (manuscriptId: string, updates: Partial<Manuscript>) => Promise<void>;
  deleteManuscript: (manuscriptId: string) => Promise<void>;
  
  // Scene operations
  updateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  reorderScenes: (manuscriptId: string, newOrder: string[]) => Promise<void>;
  splitScene: (sceneId: string, position: number) => Promise<Scene>;
  mergeScenes: (sceneIds: string[]) => Promise<Scene>;
  
  // Character operations
  addCharacter: (character: Omit<Character, 'id' | 'createdAt'>) => Promise<Character>;
  updateCharacter: (characterId: string, updates: Partial<Character>) => Promise<void>;
  deleteCharacter: (characterId: string) => Promise<void>;
  
  // Revision note operations
  addRevisionNote: (note: Omit<RevisionNote, 'id' | 'createdAt'>) => Promise<RevisionNote>;
  updateRevisionNote: (noteId: string, updates: Partial<RevisionNote>) => Promise<void>;
  deleteRevisionNote: (noteId: string) => Promise<void>;
}

export const useManuscriptStore = create<ManuscriptStore>((set, get) => ({
  // Initial state
  manuscripts: [],
  activeManuscript: null,
  scenes: new Map(),
  characters: new Map(),
  revisionNotes: new Map(),
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      await get().loadManuscripts();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to initialize' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadManuscripts: async () => {
    try {
      const manuscripts = await invoke<Manuscript[]>('get_manuscripts');
      set({ manuscripts });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load manuscripts' });
      throw error;
    }
  },

  loadManuscriptData: async (manuscriptId: string) => {
    try {
      // Load scenes using Tauri command
      const scenes = await invoke<Scene[]>('get_scenes', { manuscriptId });
      
      // For now, we'll implement a simplified version
      // In a full implementation, you'd load characters and revision notes as well
      
      const newScenes = new Map(get().scenes);
      newScenes.set(manuscriptId, scenes);
      
      set({ scenes: newScenes });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load manuscript data' });
      throw error;
    }
  },

  setActiveManuscript: (manuscript) => {
    set({ activeManuscript: manuscript });
    if (manuscript) {
      get().loadManuscriptData(manuscript.id);
    }
  },

  createManuscript: async (title, text, metadata = {}) => {
    set({ isLoading: true, error: null });
    try {
      const manuscript = await invoke<Manuscript>('create_manuscript', {
        title,
        text,
        metadata: metadata ? JSON.stringify(metadata) : null
      });
      
      set({
        manuscripts: [...get().manuscripts, manuscript],
      });
      
      return manuscript;
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create manuscript' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateManuscript: async (manuscriptId, updates) => {
    try {
      // This is a placeholder - implement proper Tauri command for updating manuscripts
      await invoke('update_manuscript', { manuscriptId, updates });
      
      // Update local state
      set({
        manuscripts: get().manuscripts.map(m => 
          m.id === manuscriptId ? { ...m, ...updates, updatedAt: Date.now() } : m
        ),
        activeManuscript: get().activeManuscript?.id === manuscriptId 
          ? { ...get().activeManuscript!, ...updates, updatedAt: Date.now() }
          : get().activeManuscript
      });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update manuscript' });
      throw error;
    }
  },

  deleteManuscript: async (manuscriptId) => {
    try {
      await invoke('delete_manuscript', { manuscriptId });
      
      const newScenes = new Map(get().scenes);
      const newCharacters = new Map(get().characters);
      const newRevisionNotes = new Map(get().revisionNotes);
      
      newScenes.delete(manuscriptId);
      newCharacters.delete(manuscriptId);
      newRevisionNotes.delete(manuscriptId);
      
      set({
        manuscripts: get().manuscripts.filter(m => m.id !== manuscriptId),
        scenes: newScenes,
        characters: newCharacters,
        revisionNotes: newRevisionNotes,
        activeManuscript: get().activeManuscript?.id === manuscriptId ? null : get().activeManuscript
      });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete manuscript' });
      throw error;
    }
  },

  updateScene: async (sceneId, updates) => {
    try {
      await invoke('update_scene', { sceneId, updates });
      
      // Update local state
      const newScenes = new Map(get().scenes);
      for (const [manuscriptId, scenes] of newScenes.entries()) {
        const updatedScenes = scenes.map(scene => 
          scene.id === sceneId ? { ...scene, ...updates, updatedAt: Date.now() } : scene
        );
        newScenes.set(manuscriptId, updatedScenes);
      }
      
      set({ scenes: newScenes });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update scene' });
      throw error;
    }
  },

  reorderScenes: async (manuscriptId, newOrder) => {
    try {
      await invoke('reorder_scenes', { manuscriptId, newOrder });
      
      const scenes = get().scenes.get(manuscriptId) || [];
      const sceneMap = new Map(scenes.map(scene => [scene.id, scene]));
      
      const reorderedScenes = newOrder.map((id, index) => ({
        ...sceneMap.get(id)!,
        indexInManuscript: index,
        updatedAt: Date.now()
      }));
      
      const newScenes = new Map(get().scenes);
      newScenes.set(manuscriptId, reorderedScenes);
      set({ scenes: newScenes });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to reorder scenes' });
      throw error;
    }
  },

  splitScene: async (sceneId, position) => {
    try {
      const newScene = await invoke<Scene>('split_scene', { sceneId, position });
      
      // Reload manuscript data to get updated scenes
      const manuscriptId = get().activeManuscript?.id;
      if (manuscriptId) {
        await get().loadManuscriptData(manuscriptId);
      }
      
      return newScene;
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to split scene' });
      throw error;
    }
  },

  mergeScenes: async (sceneIds) => {
    try {
      const mergedScene = await invoke<Scene>('merge_scenes', { sceneIds });
      
      // Reload manuscript data to get updated scenes
      const manuscriptId = get().activeManuscript?.id;
      if (manuscriptId) {
        await get().loadManuscriptData(manuscriptId);
      }
      
      return mergedScene;
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to merge scenes' });
      throw error;
    }
  },

  // Character operations - these are placeholder implementations
  addCharacter: async (character) => {
    try {
      const newCharacter = await invoke<Character>('add_character', { character });
      
      const newCharacters = new Map(get().characters);
      const existing = newCharacters.get(character.manuscriptId) || [];
      newCharacters.set(character.manuscriptId, [...existing, newCharacter]);
      
      set({ characters: newCharacters });
      return newCharacter;
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add character' });
      throw error;
    }
  },

  updateCharacter: async (characterId, updates) => {
    try {
      await invoke('update_character', { characterId, updates });
      
      const newCharacters = new Map(get().characters);
      for (const [manuscriptId, characters] of newCharacters.entries()) {
        const updatedCharacters = characters.map(char => 
          char.id === characterId ? { ...char, ...updates } : char
        );
        newCharacters.set(manuscriptId, updatedCharacters);
      }
      
      set({ characters: newCharacters });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update character' });
      throw error;
    }
  },

  deleteCharacter: async (characterId) => {
    try {
      await invoke('delete_character', { characterId });
      
      const newCharacters = new Map(get().characters);
      for (const [manuscriptId, characters] of newCharacters.entries()) {
        const filtered = characters.filter(char => char.id !== characterId);
        newCharacters.set(manuscriptId, filtered);
      }
      
      set({ characters: newCharacters });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete character' });
      throw error;
    }
  },

  // Revision note operations - placeholder implementations
  addRevisionNote: async (note) => {
    try {
      const newNote = await invoke<RevisionNote>('add_revision_note', { note });
      
      const manuscriptId = get().activeManuscript?.id;
      if (manuscriptId) {
        const newRevisionNotes = new Map(get().revisionNotes);
        const existing = newRevisionNotes.get(manuscriptId) || [];
        newRevisionNotes.set(manuscriptId, [...existing, newNote]);
        
        set({ revisionNotes: newRevisionNotes });
      }
      
      return newNote;
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add revision note' });
      throw error;
    }
  },

  updateRevisionNote: async (noteId, updates) => {
    try {
      await invoke('update_revision_note', { noteId, updates });
      
      const newRevisionNotes = new Map(get().revisionNotes);
      for (const [manuscriptId, notes] of newRevisionNotes.entries()) {
        const updatedNotes = notes.map(note => 
          note.id === noteId ? { ...note, ...updates } : note
        );
        newRevisionNotes.set(manuscriptId, updatedNotes);
      }
      
      set({ revisionNotes: newRevisionNotes });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update revision note' });
      throw error;
    }
  },

  deleteRevisionNote: async (noteId) => {
    try {
      await invoke('delete_revision_note', { noteId });
      
      const newRevisionNotes = new Map(get().revisionNotes);
      for (const [manuscriptId, notes] of newRevisionNotes.entries()) {
        const filtered = notes.filter(note => note.id !== noteId);
        newRevisionNotes.set(manuscriptId, filtered);
      }
      
      set({ revisionNotes: newRevisionNotes });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete revision note' });
      throw error;
    }
  },
}));