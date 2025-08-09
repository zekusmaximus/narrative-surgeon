import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'narrative_surgeon.db';
const DATABASE_VERSION = 2;

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createManuscriptsTable = `
      CREATE TABLE IF NOT EXISTS manuscripts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        genre TEXT,
        target_audience TEXT,
        comp_titles TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        total_word_count INTEGER DEFAULT 0,
        opening_strength_score INTEGER,
        hook_effectiveness INTEGER
      );
    `;

    const createScenesTable = `
      CREATE TABLE IF NOT EXISTS scenes (
        id TEXT PRIMARY KEY,
        manuscript_id TEXT NOT NULL,
        chapter_number INTEGER,
        scene_number_in_chapter INTEGER,
        index_in_manuscript INTEGER NOT NULL,
        title TEXT,
        raw_text TEXT NOT NULL,
        word_count INTEGER DEFAULT 0,
        is_opening BOOLEAN DEFAULT 0,
        is_chapter_end BOOLEAN DEFAULT 0,
        opens_with_hook BOOLEAN DEFAULT 0,
        ends_with_hook BOOLEAN DEFAULT 0,
        pov_character TEXT,
        location TEXT,
        time_marker TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
      );
    `;

    const createCharactersTable = `
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        manuscript_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        first_appearance_scene_id TEXT,
        voice_sample TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
      );
    `;

    const createRevisionNotesTable = `
      CREATE TABLE IF NOT EXISTS revision_notes (
        id TEXT PRIMARY KEY,
        scene_id TEXT NOT NULL,
        type TEXT,
        content TEXT NOT NULL,
        resolved BOOLEAN DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
      );
    `;

    // Phase 2: LLM Analysis Tables
    const createSceneAnalysisTable = `
      CREATE TABLE IF NOT EXISTS scene_analysis (
        id TEXT PRIMARY KEY,
        scene_id TEXT NOT NULL UNIQUE,
        summary TEXT,
        primary_emotion TEXT,
        secondary_emotion TEXT,
        tension_level INTEGER,
        pacing_score INTEGER,
        function_tags TEXT,
        voice_fingerprint TEXT,
        conflict_present BOOLEAN,
        character_introduced BOOLEAN,
        analyzed_at INTEGER,
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
      );
    `;

    const createOpeningAnalysisTable = `
      CREATE TABLE IF NOT EXISTS opening_analysis (
        id TEXT PRIMARY KEY,
        manuscript_id TEXT NOT NULL UNIQUE,
        hook_type TEXT,
        hook_strength INTEGER,
        voice_established BOOLEAN,
        character_established BOOLEAN,
        conflict_established BOOLEAN,
        genre_appropriate BOOLEAN,
        similar_to_comps TEXT,
        agent_readiness_score INTEGER,
        analysis_notes TEXT,
        analyzed_at INTEGER,
        FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
      );
    `;

    const createCharacterVoicesTable = `
      CREATE TABLE IF NOT EXISTS character_voices (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        scene_id TEXT NOT NULL,
        dialogue_sample TEXT,
        vocabulary_level INTEGER,
        sentence_patterns TEXT,
        unique_phrases TEXT,
        emotional_register TEXT,
        consistency_score INTEGER,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
      );
    `;

    const createPacingAnalysisTable = `
      CREATE TABLE IF NOT EXISTS pacing_analysis (
        id TEXT PRIMARY KEY,
        manuscript_id TEXT NOT NULL,
        act_number INTEGER,
        start_scene_id TEXT,
        end_scene_id TEXT,
        beats_per_thousand INTEGER,
        tension_arc TEXT,
        comp_title_comparison TEXT,
        suggestions TEXT,
        FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
      );
    `;

    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_scenes_manuscript_id ON scenes(manuscript_id);`,
      `CREATE INDEX IF NOT EXISTS idx_scenes_index ON scenes(index_in_manuscript);`,
      `CREATE INDEX IF NOT EXISTS idx_characters_manuscript_id ON characters(manuscript_id);`,
      `CREATE INDEX IF NOT EXISTS idx_revision_notes_scene_id ON revision_notes(scene_id);`,
      `CREATE INDEX IF NOT EXISTS idx_scene_analysis_scene_id ON scene_analysis(scene_id);`,
      `CREATE INDEX IF NOT EXISTS idx_opening_analysis_manuscript_id ON opening_analysis(manuscript_id);`,
      `CREATE INDEX IF NOT EXISTS idx_character_voices_character_id ON character_voices(character_id);`,
      `CREATE INDEX IF NOT EXISTS idx_character_voices_scene_id ON character_voices(scene_id);`,
      `CREATE INDEX IF NOT EXISTS idx_pacing_analysis_manuscript_id ON pacing_analysis(manuscript_id);`,
    ];

    try {
      // Phase 1 tables
      await this.db.execAsync(createManuscriptsTable);
      await this.db.execAsync(createScenesTable);
      await this.db.execAsync(createCharactersTable);
      await this.db.execAsync(createRevisionNotesTable);
      
      // Phase 2 tables
      await this.db.execAsync(createSceneAnalysisTable);
      await this.db.execAsync(createOpeningAnalysisTable);
      await this.db.execAsync(createCharacterVoicesTable);
      await this.db.execAsync(createPacingAnalysisTable);
      
      for (const indexQuery of createIndexes) {
        await this.db.execAsync(indexQuery);
      }
      
      console.log('All tables and indexes created successfully');
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      if (params) {
        return await this.db.runAsync(query, params);
      } else {
        return await this.db.runAsync(query);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  async getAll(query: string, params?: any[]): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      if (params) {
        return await this.db.getAllAsync(query, params);
      } else {
        return await this.db.getAllAsync(query);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  async getFirst(query: string, params?: any[]): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      if (params) {
        return await this.db.getFirstAsync(query, params);
      } else {
        return await this.db.getFirstAsync(query);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const databaseService = new DatabaseService();