import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'narrative_surgeon.db';
const DATABASE_VERSION = 1;

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

    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_scenes_manuscript_id ON scenes(manuscript_id);`,
      `CREATE INDEX IF NOT EXISTS idx_scenes_index ON scenes(index_in_manuscript);`,
      `CREATE INDEX IF NOT EXISTS idx_characters_manuscript_id ON characters(manuscript_id);`,
      `CREATE INDEX IF NOT EXISTS idx_revision_notes_scene_id ON revision_notes(scene_id);`,
    ];

    try {
      await this.db.execAsync(createManuscriptsTable);
      await this.db.execAsync(createScenesTable);
      await this.db.execAsync(createCharactersTable);
      await this.db.execAsync(createRevisionNotesTable);
      
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