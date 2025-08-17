-- Performance indexes for frequent queries

-- Manuscript indexes
CREATE INDEX IF NOT EXISTS idx_manuscripts_updated_at ON manuscripts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuscripts_created_at ON manuscripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuscripts_genre ON manuscripts(genre);
CREATE INDEX IF NOT EXISTS idx_manuscripts_author ON manuscripts(author);

-- Scene indexes for manuscript queries
CREATE INDEX IF NOT EXISTS idx_scenes_manuscript_id ON scenes(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_scenes_manuscript_index ON scenes(manuscript_id, index_in_manuscript);
CREATE INDEX IF NOT EXISTS idx_scenes_chapter ON scenes(manuscript_id, chapter_number, scene_number_in_chapter);
CREATE INDEX IF NOT EXISTS idx_scenes_updated_at ON scenes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenes_word_count ON scenes(word_count);

-- Character indexes
CREATE INDEX IF NOT EXISTS idx_characters_manuscript_id ON characters(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(role);

-- Revision notes indexes
CREATE INDEX IF NOT EXISTS idx_revision_notes_scene_id ON revision_notes(scene_id);
CREATE INDEX IF NOT EXISTS idx_revision_notes_type ON revision_notes(type);
CREATE INDEX IF NOT EXISTS idx_revision_notes_resolved ON revision_notes(resolved);
CREATE INDEX IF NOT EXISTS idx_revision_notes_created_at ON revision_notes(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scenes_manuscript_chapter_scene ON scenes(manuscript_id, chapter_number, scene_number_in_chapter);
CREATE INDEX IF NOT EXISTS idx_scenes_hooks ON scenes(manuscript_id) WHERE opens_with_hook = 1 OR ends_with_hook = 1;
CREATE INDEX IF NOT EXISTS idx_scenes_opening ON scenes(manuscript_id) WHERE is_opening = 1;

-- Index for scene text length queries
CREATE INDEX IF NOT EXISTS idx_scenes_text_length ON scenes(manuscript_id, length(raw_text));

-- Statistics indexes
CREATE INDEX IF NOT EXISTS idx_manuscripts_stats ON manuscripts(total_word_count, opening_strength_score, hook_effectiveness);