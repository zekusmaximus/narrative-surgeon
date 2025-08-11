-- Full-text search using FTS5 for high-performance text search

-- Create FTS5 virtual table for scene content search
CREATE VIRTUAL TABLE IF NOT EXISTS scenes_fts USING fts5(
    scene_id,
    manuscript_id,
    title,
    raw_text,
    pov_character,
    location,
    time_marker,
    content='scenes',
    content_rowid='rowid',
    tokenize='porter unicode61 remove_diacritics 1'
);

-- Triggers to keep FTS5 table in sync with scenes table
CREATE TRIGGER IF NOT EXISTS scenes_fts_insert AFTER INSERT ON scenes BEGIN
    INSERT INTO scenes_fts(scene_id, manuscript_id, title, raw_text, pov_character, location, time_marker)
    VALUES (new.id, new.manuscript_id, new.title, new.raw_text, new.pov_character, new.location, new.time_marker);
END;

CREATE TRIGGER IF NOT EXISTS scenes_fts_delete AFTER DELETE ON scenes BEGIN
    INSERT INTO scenes_fts(scenes_fts, scene_id, manuscript_id, title, raw_text, pov_character, location, time_marker)
    VALUES ('delete', old.id, old.manuscript_id, old.title, old.raw_text, old.pov_character, old.location, old.time_marker);
END;

CREATE TRIGGER IF NOT EXISTS scenes_fts_update AFTER UPDATE ON scenes BEGIN
    INSERT INTO scenes_fts(scenes_fts, scene_id, manuscript_id, title, raw_text, pov_character, location, time_marker)
    VALUES ('delete', old.id, old.manuscript_id, old.title, old.raw_text, old.pov_character, old.location, old.time_marker);
    INSERT INTO scenes_fts(scene_id, manuscript_id, title, raw_text, pov_character, location, time_marker)
    VALUES (new.id, new.manuscript_id, new.title, new.raw_text, new.pov_character, new.location, new.time_marker);
END;

-- Populate FTS5 table with existing data
INSERT INTO scenes_fts(scene_id, manuscript_id, title, raw_text, pov_character, location, time_marker)
SELECT id, manuscript_id, title, raw_text, pov_character, location, time_marker FROM scenes;

-- Create FTS5 virtual table for manuscript search
CREATE VIRTUAL TABLE IF NOT EXISTS manuscripts_fts USING fts5(
    manuscript_id,
    title,
    author,
    genre,
    target_audience,
    comp_titles,
    content='manuscripts',
    content_rowid='rowid',
    tokenize='porter unicode61 remove_diacritics 1'
);

-- Triggers for manuscript FTS
CREATE TRIGGER IF NOT EXISTS manuscripts_fts_insert AFTER INSERT ON manuscripts BEGIN
    INSERT INTO manuscripts_fts(manuscript_id, title, author, genre, target_audience, comp_titles)
    VALUES (new.id, new.title, new.author, new.genre, new.target_audience, new.comp_titles);
END;

CREATE TRIGGER IF NOT EXISTS manuscripts_fts_delete AFTER DELETE ON manuscripts BEGIN
    INSERT INTO manuscripts_fts(manuscripts_fts, manuscript_id, title, author, genre, target_audience, comp_titles)
    VALUES ('delete', old.id, old.title, old.author, old.genre, old.target_audience, old.comp_titles);
END;

CREATE TRIGGER IF NOT EXISTS manuscripts_fts_update AFTER UPDATE ON manuscripts BEGIN
    INSERT INTO manuscripts_fts(manuscripts_fts, manuscript_id, title, author, genre, target_audience, comp_titles)
    VALUES ('delete', old.id, old.title, old.author, old.genre, old.target_audience, old.comp_titles);
    INSERT INTO manuscripts_fts(manuscript_id, title, author, genre, target_audience, comp_titles)
    VALUES (new.id, new.title, new.author, new.genre, new.target_audience, new.comp_titles);
END;

-- Populate manuscript FTS
INSERT INTO manuscripts_fts(manuscript_id, title, author, genre, target_audience, comp_titles)
SELECT id, title, author, genre, target_audience, comp_titles FROM manuscripts;

-- Create search history table for query suggestions
CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    manuscript_id TEXT,
    result_count INTEGER DEFAULT 0,
    search_time_ms INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_manuscript ON search_history(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);

-- Create search suggestions view
CREATE VIEW IF NOT EXISTS search_suggestions AS
SELECT 
    query,
    COUNT(*) as usage_count,
    AVG(result_count) as avg_results,
    MAX(created_at) as last_used
FROM search_history 
WHERE result_count > 0
GROUP BY query
ORDER BY usage_count DESC, last_used DESC
LIMIT 50;