import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Manuscript, Scene, Character, RevisionNote } from '../types';
import { databaseService } from '../services/database';
import { SceneParser } from '../services/sceneParser';

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
      await databaseService.initialize();
      await get().loadManuscripts();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to initialize' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadManuscripts: async () => {
    try {
      const manuscriptsData = await databaseService.getAll('SELECT * FROM manuscripts ORDER BY updated_at DESC');
      const manuscripts: Manuscript[] = manuscriptsData.map(row => ({
        id: row.id,
        title: row.title,
        genre: row.genre,
        targetAudience: row.target_audience,
        compTitles: row.comp_titles ? JSON.parse(row.comp_titles) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        totalWordCount: row.total_word_count,
        openingStrengthScore: row.opening_strength_score,
        hookEffectiveness: row.hook_effectiveness,
      }));
      
      set({ manuscripts });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load manuscripts' });
    }
  },

  loadManuscriptData: async (manuscriptId: string) => {
    try {
      // Load scenes
      const scenesData = await databaseService.getAll(
        'SELECT * FROM scenes WHERE manuscript_id = ? ORDER BY index_in_manuscript',
        [manuscriptId]
      );
      
      const scenes: Scene[] = scenesData.map(row => ({
        id: row.id,
        manuscriptId: row.manuscript_id,
        chapterNumber: row.chapter_number,
        sceneNumberInChapter: row.scene_number_in_chapter,
        indexInManuscript: row.index_in_manuscript,
        title: row.title,
        rawText: row.raw_text,
        wordCount: row.word_count,
        isOpening: Boolean(row.is_opening),
        isChapterEnd: Boolean(row.is_chapter_end),
        opensWithHook: Boolean(row.opens_with_hook),
        endsWithHook: Boolean(row.ends_with_hook),
        povCharacter: row.pov_character,
        location: row.location,
        timeMarker: row.time_marker,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Load characters
      const charactersData = await databaseService.getAll(
        'SELECT * FROM characters WHERE manuscript_id = ? ORDER BY created_at',
        [manuscriptId]
      );
      
      const characters: Character[] = charactersData.map(row => ({
        id: row.id,
        manuscriptId: row.manuscript_id,
        name: row.name,
        role: row.role,
        firstAppearanceSceneId: row.first_appearance_scene_id,
        voiceSample: row.voice_sample,
        createdAt: row.created_at,
      }));

      // Load revision notes
      const notesData = await databaseService.getAll(`
        SELECT rn.* FROM revision_notes rn
        JOIN scenes s ON rn.scene_id = s.id
        WHERE s.manuscript_id = ?
        ORDER BY rn.created_at DESC
      `, [manuscriptId]);
      
      const revisionNotes: RevisionNote[] = notesData.map(row => ({
        id: row.id,
        sceneId: row.scene_id,
        type: row.type,
        content: row.content,
        resolved: Boolean(row.resolved),
        createdAt: row.created_at,
      }));

      // Update store
      const newScenes = new Map(get().scenes);
      const newCharacters = new Map(get().characters);
      const newRevisionNotes = new Map(get().revisionNotes);
      
      newScenes.set(manuscriptId, scenes);
      newCharacters.set(manuscriptId, characters);
      newRevisionNotes.set(manuscriptId, revisionNotes);
      
      set({ 
        scenes: newScenes,
        characters: newCharacters,
        revisionNotes: newRevisionNotes
      });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load manuscript data' });
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
      const manuscriptId = uuidv4();
      const now = Date.now();
      
      const parser = new SceneParser();
      const chapterBreaks = parser.detectChapterBreaks(text);
      let scenes = parser.segmentScenes(text, chapterBreaks);
      scenes = parser.markOpeningPages(scenes);
      scenes = parser.identifyChapterEnds(scenes);
      
      // Update scenes with manuscript ID
      scenes = scenes.map(scene => ({ ...scene, manuscriptId }));
      
      const totalWordCount = scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
      
      const manuscript: Manuscript = {
        id: manuscriptId,
        title,
        genre: metadata.genre,
        targetAudience: metadata.targetAudience,
        compTitles: metadata.compTitles,
        createdAt: now,
        updatedAt: now,
        totalWordCount,
        openingStrengthScore: metadata.openingStrengthScore,
        hookEffectiveness: metadata.hookEffectiveness,
      };

      // Save to database
      await databaseService.executeQuery(`
        INSERT INTO manuscripts (
          id, title, genre, target_audience, comp_titles, created_at, updated_at, total_word_count,
          opening_strength_score, hook_effectiveness
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        manuscript.id,
        manuscript.title,
        manuscript.genre || null,
        manuscript.targetAudience || null,
        manuscript.compTitles ? JSON.stringify(manuscript.compTitles) : null,
        manuscript.createdAt,
        manuscript.updatedAt,
        manuscript.totalWordCount,
        manuscript.openingStrengthScore || null,
        manuscript.hookEffectiveness || null,
      ]);

      // Save scenes
      for (const scene of scenes) {
        await databaseService.executeQuery(`
          INSERT INTO scenes (
            id, manuscript_id, chapter_number, scene_number_in_chapter, index_in_manuscript,
            title, raw_text, word_count, is_opening, is_chapter_end, opens_with_hook,
            ends_with_hook, pov_character, location, time_marker, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          scene.id,
          scene.manuscriptId,
          scene.chapterNumber || null,
          scene.sceneNumberInChapter || null,
          scene.indexInManuscript,
          scene.title || null,
          scene.rawText,
          scene.wordCount,
          scene.isOpening ? 1 : 0,
          scene.isChapterEnd ? 1 : 0,
          scene.opensWithHook ? 1 : 0,
          scene.endsWithHook ? 1 : 0,
          scene.povCharacter || null,
          scene.location || null,
          scene.timeMarker || null,
          scene.createdAt,
          scene.updatedAt,
        ]);
      }

      // Update local state
      const newScenes = new Map(get().scenes);
      newScenes.set(manuscriptId, scenes);
      
      set({ 
        manuscripts: [...get().manuscripts, manuscript],
        scenes: newScenes,
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
      const now = Date.now();
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'targetAudience' ? 'target_audience' :
                       key === 'compTitles' ? 'comp_titles' :
                       key === 'totalWordCount' ? 'total_word_count' :
                       key === 'openingStrengthScore' ? 'opening_strength_score' :
                       key === 'hookEffectiveness' ? 'hook_effectiveness' : key;
          
          updateFields.push(`${dbKey} = ?`);
          values.push(key === 'compTitles' && Array.isArray(value) ? JSON.stringify(value) : value);
        }
      });
      
      updateFields.push('updated_at = ?');
      values.push(now);
      values.push(manuscriptId);
      
      await databaseService.executeQuery(
        `UPDATE manuscripts SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      
      // Update local state
      set({
        manuscripts: get().manuscripts.map(m => 
          m.id === manuscriptId ? { ...m, ...updates, updatedAt: now } : m
        ),
        activeManuscript: get().activeManuscript?.id === manuscriptId 
          ? { ...get().activeManuscript!, ...updates, updatedAt: now }
          : get().activeManuscript
      });
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update manuscript' });
      throw error;
    }
  },

  deleteManuscript: async (manuscriptId) => {
    try {
      await databaseService.executeQuery('DELETE FROM manuscripts WHERE id = ?', [manuscriptId]);
      
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
      const now = Date.now();
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'manuscriptId' ? 'manuscript_id' :
                       key === 'chapterNumber' ? 'chapter_number' :
                       key === 'sceneNumberInChapter' ? 'scene_number_in_chapter' :
                       key === 'indexInManuscript' ? 'index_in_manuscript' :
                       key === 'rawText' ? 'raw_text' :
                       key === 'wordCount' ? 'word_count' :
                       key === 'isOpening' ? 'is_opening' :
                       key === 'isChapterEnd' ? 'is_chapter_end' :
                       key === 'opensWithHook' ? 'opens_with_hook' :
                       key === 'endsWithHook' ? 'ends_with_hook' :
                       key === 'povCharacter' ? 'pov_character' :
                       key === 'timeMarker' ? 'time_marker' : key;
          
          updateFields.push(`${dbKey} = ?`);
          
          if (typeof value === 'boolean') {
            values.push(value ? 1 : 0);
          } else {
            values.push(value);
          }
        }
      });
      
      updateFields.push('updated_at = ?');
      values.push(now);
      values.push(sceneId);
      
      await databaseService.executeQuery(
        `UPDATE scenes SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      
      // Update local state
      const newScenes = new Map(get().scenes);
      for (const [manuscriptId, scenes] of newScenes.entries()) {
        const updatedScenes = scenes.map(scene => 
          scene.id === sceneId ? { ...scene, ...updates, updatedAt: now } : scene
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
      const scenes = get().scenes.get(manuscriptId) || [];
      const sceneMap = new Map(scenes.map(scene => [scene.id, scene]));
      
      for (let i = 0; i < newOrder.length; i++) {
        const sceneId = newOrder[i];
        await databaseService.executeQuery(
          'UPDATE scenes SET index_in_manuscript = ?, updated_at = ? WHERE id = ?',
          [i, Date.now(), sceneId]
        );
      }
      
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
      const manuscriptId = get().activeManuscript?.id;
      if (!manuscriptId) throw new Error('No active manuscript');
      
      const scenes = get().scenes.get(manuscriptId) || [];
      const scene = scenes.find(s => s.id === sceneId);
      if (!scene) throw new Error('Scene not found');
      
      const beforeText = scene.rawText.slice(0, position).trim();
      const afterText = scene.rawText.slice(position).trim();
      
      if (!beforeText || !afterText) throw new Error('Cannot split scene at this position');
      
      const parser = new SceneParser();
      const newSceneId = uuidv4();
      const now = Date.now();
      
      const beforeWordCount = parser['countWords'](beforeText);
      const afterWordCount = parser['countWords'](afterText);
      
      const newScene: Scene = {
        ...scene,
        id: newSceneId,
        rawText: afterText,
        wordCount: afterWordCount,
        indexInManuscript: scene.indexInManuscript + 1,
        sceneNumberInChapter: (scene.sceneNumberInChapter || 0) + 1,
        createdAt: now,
        updatedAt: now,
      };
      
      await get().updateScene(sceneId, {
        rawText: beforeText,
        wordCount: beforeWordCount,
      });
      
      await databaseService.executeQuery(`
        INSERT INTO scenes (
          id, manuscript_id, chapter_number, scene_number_in_chapter, index_in_manuscript,
          title, raw_text, word_count, is_opening, is_chapter_end, opens_with_hook,
          ends_with_hook, pov_character, location, time_marker, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newScene.id,
        newScene.manuscriptId,
        newScene.chapterNumber || null,
        newScene.sceneNumberInChapter || null,
        newScene.indexInManuscript,
        newScene.title || null,
        newScene.rawText,
        newScene.wordCount,
        newScene.isOpening ? 1 : 0,
        newScene.isChapterEnd ? 1 : 0,
        newScene.opensWithHook ? 1 : 0,
        newScene.endsWithHook ? 1 : 0,
        newScene.povCharacter || null,
        newScene.location || null,
        newScene.timeMarker || null,
        newScene.createdAt,
        newScene.updatedAt,
      ]);
      
      // Reorder subsequent scenes
      const reorderedIds = scenes
        .filter(s => s.indexInManuscript > scene.indexInManuscript)
        .map(s => s.id);
      
      for (let i = 0; i < reorderedIds.length; i++) {
        await databaseService.executeQuery(
          'UPDATE scenes SET index_in_manuscript = ? WHERE id = ?',
          [scene.indexInManuscript + 2 + i, reorderedIds[i]]
        );
      }
      
      await get().loadManuscriptData(manuscriptId);
      return newScene;
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to split scene' });
      throw error;
    }
  },

  mergeScenes: async (sceneIds) => {
    try {
      if (sceneIds.length < 2) throw new Error('Need at least 2 scenes to merge');
      
      const manuscriptId = get().activeManuscript?.id;
      if (!manuscriptId) throw new Error('No active manuscript');
      
      const scenes = get().scenes.get(manuscriptId) || [];
      const scenesToMerge = sceneIds
        .map(id => scenes.find(s => s.id === id))
        .filter((s): s is Scene => s !== undefined)
        .sort((a, b) => a.indexInManuscript - b.indexInManuscript);
      
      if (scenesToMerge.length !== sceneIds.length) {
        throw new Error('Some scenes not found');
      }
      
      const firstScene = scenesToMerge[0];
      const mergedText = scenesToMerge.map(s => s.rawText).join('\n\n');
      const parser = new SceneParser();
      const mergedWordCount = parser['countWords'](mergedText);
      
      await get().updateScene(firstScene.id, {
        rawText: mergedText,
        wordCount: mergedWordCount,
      });
      
      // Delete other scenes
      for (let i = 1; i < scenesToMerge.length; i++) {
        await databaseService.executeQuery('DELETE FROM scenes WHERE id = ?', [scenesToMerge[i].id]);
      }
      
      await get().loadManuscriptData(manuscriptId);
      
      return {
        ...firstScene,
        rawText: mergedText,
        wordCount: mergedWordCount,
        updatedAt: Date.now(),
      };
      
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to merge scenes' });
      throw error;
    }
  },

  addCharacter: async (character) => {
    try {
      const characterId = uuidv4();
      const now = Date.now();
      
      const newCharacter: Character = {
        ...character,
        id: characterId,
        createdAt: now,
      };
      
      await databaseService.executeQuery(`
        INSERT INTO characters (id, manuscript_id, name, role, first_appearance_scene_id, voice_sample, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        newCharacter.id,
        newCharacter.manuscriptId,
        newCharacter.name,
        newCharacter.role || null,
        newCharacter.firstAppearanceSceneId || null,
        newCharacter.voiceSample || null,
        newCharacter.createdAt,
      ]);
      
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
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'manuscriptId' ? 'manuscript_id' :
                       key === 'firstAppearanceSceneId' ? 'first_appearance_scene_id' :
                       key === 'voiceSample' ? 'voice_sample' : key;
          
          updateFields.push(`${dbKey} = ?`);
          values.push(value);
        }
      });
      
      values.push(characterId);
      
      await databaseService.executeQuery(
        `UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      
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
      await databaseService.executeQuery('DELETE FROM characters WHERE id = ?', [characterId]);
      
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

  addRevisionNote: async (note) => {
    try {
      const noteId = uuidv4();
      const now = Date.now();
      
      const newNote: RevisionNote = {
        ...note,
        id: noteId,
        createdAt: now,
      };
      
      await databaseService.executeQuery(`
        INSERT INTO revision_notes (id, scene_id, type, content, resolved, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        newNote.id,
        newNote.sceneId,
        newNote.type || null,
        newNote.content,
        newNote.resolved ? 1 : 0,
        newNote.createdAt,
      ]);
      
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
      const updateFields: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'sceneId' ? 'scene_id' : key;
          updateFields.push(`${dbKey} = ?`);
          values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
        }
      });
      
      values.push(noteId);
      
      await databaseService.executeQuery(
        `UPDATE revision_notes SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      
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
      await databaseService.executeQuery('DELETE FROM revision_notes WHERE id = ?', [noteId]);
      
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