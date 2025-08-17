-- Migration to simplify database for single manuscript mode
-- This removes manuscript_id foreign keys and enforces singleton patterns

-- Insert the hardcoded manuscript data first (only if no manuscript exists)
INSERT OR IGNORE INTO manuscripts (
    id, 
    title, 
    author, 
    genre, 
    target_audience, 
    comp_titles, 
    created_at, 
    updated_at, 
    total_word_count,
    opening_strength_score,
    hook_effectiveness
) VALUES (
    'singleton-manuscript',
    'The Last Echo of Midnight',
    'Alex Rivera',
    'Urban Fantasy',
    'Adult',
    'The City & The City by China Miéville, The Broken Earth by N.K. Jemisin',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000,
    85000,
    8,
    7
);

-- Insert sample scenes
INSERT OR IGNORE INTO scenes (
    id,
    manuscript_id,
    chapter_number,
    scene_number_in_chapter,
    index_in_manuscript,
    title,
    raw_text,
    word_count,
    is_opening,
    is_chapter_end,
    opens_with_hook,
    ends_with_hook,
    pov_character,
    location,
    time_marker,
    created_at,
    updated_at
) VALUES 
(
    'scene-001',
    'singleton-manuscript',
    1,
    1,
    0,
    'The Night Market',
    'The midnight bells of San Sombra had barely finished their haunting chime when Maya Delacroix felt the first tremor run through the city''s bones. She paused at the entrance to the Night Market, her hand instinctively moving to the obsidian pendant at her throat—the one that had been warming against her skin for the past three days.

"Another quake?" asked Jin, her business partner, as he adjusted the strap of his messenger bag filled with rare books and stranger things. His dark eyes reflected the ethereal glow of the market''s floating lanterns, each one containing a whisper of captured starlight.

"No," Maya whispered, her voice barely audible over the distant hum of the city''s underground trains. "Something else entirely."

The Night Market sprawled before them like a fever dream made manifest. Vendors hawked everything from bottled memories to clockwork hearts, their stalls illuminated by bioluminescent fungi that pulsed in rhythm with the city''s hidden heartbeat. Tonight, however, something felt different. The usual cacophony of voices seemed muted, as if the very air itself was holding its breath.

Maya had been coming to the Night Market for five years, ever since she''d discovered her ability to see the threads that connected all things—the shimmering lines of possibility that most humans remained blind to. Tonight, those threads were fraying at the edges, and she could taste copper and ozone on her tongue.

"The Meridian," she breathed, understanding flooding through her like ice water. "Someone''s trying to break the Meridian."

Jin''s face went pale. As a cartographer of impossible places, he understood the implications better than most. The Meridian was the mystical barrier that kept San Sombra''s supernatural residents hidden from the mundane world. If it fell, the careful balance between the seen and unseen would shatter like glass.',
    487,
    1,
    0,
    1,
    1,
    'Maya Delacroix',
    'Night Market, San Sombra',
    'Midnight',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
),
(
    'scene-002',
    'singleton-manuscript',
    1,
    2,
    1,
    'The Warning',
    'They pushed deeper into the market, past the fortune teller whose crystal ball swirled with miniature storms, past the woman selling dreams in mason jars, each one glowing with its own particular hue of hope or nightmare. Maya''s pendant grew warmer with each step, and the threads of possibility around them began to pulse in frantic patterns.

"Maya!" The voice that called her name was familiar yet distant, as if it traveled through water. She turned to see Ezra Blackthorne emerging from between two vendor stalls, his silver hair catching the lantern light like mercury. As the unofficial leader of the supernatural community, Ezra commanded respect from vampires and fae folk alike, but tonight his usually composed demeanor was cracked with worry.

"Thank the shadows you''re here," he said, his accent carrying traces of old Edinburgh despite his centuries in the Americas. "We''ve got a situation that requires your particular talents."

"The Meridian," Maya said, not bothering to phrase it as a question. "Who would be foolish enough to—"

"Not foolish," Ezra interrupted, his pale blue eyes reflecting an urgency Maya had never seen before. "Desperate. And well-funded. We''ve traced the disturbances to someone calling themselves the Architect. They''ve been systematically targeting the anchor points—the places where the Meridian draws its strength."

Jin pulled out his leather-bound notebook, its pages filled with hand-drawn maps of places that existed in the spaces between spaces. "How many anchor points are compromised?"

"Three of seven," Ezra replied grimly. "The old cathedral, the subway junction beneath Fifth and Main, and the mural in Chinatown. Each one was hit with precision—whoever this Architect is, they understand our city''s mystical infrastructure better than they should."

Maya felt a chill that had nothing to do with the night air. The anchor points weren''t common knowledge, even among the supernatural community. Someone with access to that information was either very old, very connected, or very dangerous. Possibly all three.',
    341,
    0,
    1,
    0,
    1,
    'Maya Delacroix',
    'Night Market, San Sombra',
    'Midnight',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- Insert sample characters
INSERT OR IGNORE INTO characters (
    id,
    manuscript_id,
    name,
    role,
    first_appearance_scene_id,
    voice_sample,
    created_at
) VALUES 
(
    'char-maya',
    'singleton-manuscript',
    'Maya Delacroix',
    'Protagonist',
    'scene-001',
    'Maya speaks with quiet intensity, often using metaphorical language related to threads and connections. She tends to be direct but thoughtful.',
    strftime('%s', 'now') * 1000
),
(
    'char-jin',
    'singleton-manuscript',
    'Jin Chen',
    'Supporting Character',
    'scene-001',
    'Jin is practical and observant, with a scholarly way of speaking. He asks clarifying questions and focuses on concrete details.',
    strftime('%s', 'now') * 1000
),
(
    'char-ezra',
    'singleton-manuscript',
    'Ezra Blackthorne',
    'Mentor Figure',
    'scene-002',
    'Ezra has a formal, slightly old-fashioned way of speaking with traces of his Scottish origins. He''s authoritative but shows vulnerability in crisis.',
    strftime('%s', 'now') * 1000
);

-- Drop existing foreign key constraints and indexes that reference manuscript_id
DROP INDEX IF EXISTS idx_scenes_manuscript_id;
DROP INDEX IF EXISTS idx_characters_manuscript_id;
DROP INDEX IF EXISTS idx_opening_analysis_manuscript_id;
DROP INDEX IF EXISTS idx_pacing_analysis_manuscript_id;
DROP INDEX IF EXISTS idx_revision_sessions_manuscript_id;
DROP INDEX IF EXISTS idx_edit_patterns_manuscript_id;
DROP INDEX IF EXISTS idx_comp_analysis_manuscript_id;
DROP INDEX IF EXISTS idx_beta_reader_personas_manuscript_id;
DROP INDEX IF EXISTS idx_query_letters_manuscript_id;
DROP INDEX IF EXISTS idx_synopses_manuscript_id;
DROP INDEX IF EXISTS idx_sample_pages_manuscript_id;
DROP INDEX IF EXISTS idx_submission_tracking_manuscript_id;
DROP INDEX IF EXISTS idx_submission_analytics_manuscript_id;
DROP INDEX IF EXISTS idx_agent_matching_manuscript_id;

-- Recreate tables without manuscript_id foreign keys
-- Keep manuscript table but enforce single record with trigger

-- Drop and recreate scenes table
DROP TABLE scenes;
CREATE TABLE scenes (
    id TEXT PRIMARY KEY,
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
    updated_at INTEGER NOT NULL
);

-- Drop and recreate characters table
DROP TABLE characters;
CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    first_appearance_scene_id TEXT,
    voice_sample TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (first_appearance_scene_id) REFERENCES scenes(id) ON DELETE SET NULL
);

-- Drop and recreate opening_analysis table (singleton)
DROP TABLE opening_analysis;
CREATE TABLE opening_analysis (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    hook_type TEXT,
    hook_strength INTEGER,
    voice_established BOOLEAN,
    character_established BOOLEAN,
    conflict_established BOOLEAN,
    genre_appropriate BOOLEAN,
    similar_to_comps TEXT,
    agent_readiness_score INTEGER,
    analysis_notes TEXT,
    analyzed_at INTEGER
);

-- Drop and recreate pacing_analysis table
DROP TABLE pacing_analysis;
CREATE TABLE pacing_analysis (
    id TEXT PRIMARY KEY,
    act_number INTEGER,
    start_scene_id TEXT,
    end_scene_id TEXT,
    beats_per_thousand INTEGER,
    tension_arc TEXT,
    comp_title_comparison TEXT,
    suggestions TEXT,
    FOREIGN KEY (start_scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (end_scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- Drop and recreate revision_sessions table
DROP TABLE revision_sessions;
CREATE TABLE revision_sessions (
    id TEXT PRIMARY KEY,
    session_type TEXT,
    focus_area TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    scenes_revised INTEGER DEFAULT 0,
    words_changed INTEGER DEFAULT 0,
    quality_delta INTEGER
);

-- Drop and recreate edit_patterns table
DROP TABLE edit_patterns;
CREATE TABLE edit_patterns (
    id TEXT PRIMARY KEY,
    pattern_type TEXT,
    pattern_text TEXT,
    frequency INTEGER,
    severity INTEGER,
    auto_fix_available BOOLEAN,
    suggested_alternatives TEXT
);

-- Drop and recreate comp_analysis table
DROP TABLE comp_analysis;
CREATE TABLE comp_analysis (
    id TEXT PRIMARY KEY,
    comp_title TEXT NOT NULL,
    comp_author TEXT,
    opening_similarity INTEGER,
    pacing_similarity INTEGER,
    voice_similarity INTEGER,
    structure_similarity INTEGER,
    market_position TEXT,
    key_differences TEXT,
    key_similarities TEXT,
    analyzed_at INTEGER
);

-- Drop and recreate beta_reader_personas table
DROP TABLE beta_reader_personas;
CREATE TABLE beta_reader_personas (
    id TEXT PRIMARY KEY,
    persona_type TEXT,
    expectations TEXT,
    likely_reactions TEXT,
    engagement_curve TEXT,
    would_continue_reading BOOLEAN,
    would_recommend BOOLEAN,
    primary_criticism TEXT,
    primary_praise TEXT
);

-- Drop and recreate query_letters table
DROP TABLE query_letters;
CREATE TABLE query_letters (
    id TEXT PRIMARY KEY,
    version_number INTEGER DEFAULT 1,
    hook TEXT NOT NULL,
    bio TEXT NOT NULL,
    logline TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    comp_titles TEXT NOT NULL,
    personalization_template TEXT,
    generated_text TEXT NOT NULL,
    optimization_score INTEGER,
    ab_test_group TEXT,
    performance_metrics TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Drop and recreate synopses table
DROP TABLE synopses;
CREATE TABLE synopses (
    id TEXT PRIMARY KEY,
    length_type TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    content TEXT NOT NULL,
    structural_beats TEXT,
    character_arcs TEXT,
    genre_elements TEXT,
    optimization_score INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Drop and recreate sample_pages table
DROP TABLE sample_pages;
CREATE TABLE sample_pages (
    id TEXT PRIMARY KEY,
    page_count INTEGER NOT NULL,
    format_type TEXT NOT NULL,
    content TEXT NOT NULL,
    font_settings TEXT,
    margin_settings TEXT,
    header_settings TEXT,
    industry_standard TEXT,
    file_path TEXT,
    created_at INTEGER NOT NULL
);

-- Drop and recreate submission_tracking table
DROP TABLE submission_tracking;
CREATE TABLE submission_tracking (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    query_letter_id TEXT,
    synopsis_id TEXT,
    sample_pages_id TEXT,
    submission_date INTEGER NOT NULL,
    status TEXT NOT NULL,
    response_date INTEGER,
    response_type TEXT,
    personalization_notes TEXT,
    follow_up_date INTEGER,
    notes TEXT,
    tags TEXT,
    FOREIGN KEY (agent_id) REFERENCES agent_database(id),
    FOREIGN KEY (query_letter_id) REFERENCES query_letters(id),
    FOREIGN KEY (synopsis_id) REFERENCES synopses(id),
    FOREIGN KEY (sample_pages_id) REFERENCES sample_pages(id)
);

-- Drop and recreate submission_analytics table (singleton)
DROP TABLE submission_analytics;
CREATE TABLE submission_analytics (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    time_period TEXT,
    submissions_sent INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    requests_for_more INTEGER DEFAULT 0,
    rejections INTEGER DEFAULT 0,
    no_responses INTEGER DEFAULT 0,
    response_rate REAL,
    request_rate REAL,
    avg_response_time REAL,
    top_rejection_reasons TEXT,
    optimization_suggestions TEXT,
    calculated_at INTEGER NOT NULL
);

-- Drop and recreate agent_matching table
DROP TABLE agent_matching;
CREATE TABLE agent_matching (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    compatibility_score INTEGER NOT NULL,
    genre_match_score INTEGER,
    client_success_score INTEGER,
    submission_preferences_score INTEGER,
    market_position_score INTEGER,
    match_reasoning TEXT,
    priority_rank INTEGER,
    contacted BOOLEAN DEFAULT 0,
    calculated_at INTEGER NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agent_database(id)
);

-- Create triggers to enforce single manuscript record
CREATE TRIGGER manuscripts_single_record_insert
    BEFORE INSERT ON manuscripts
    WHEN (SELECT COUNT(*) FROM manuscripts) >= 1
BEGIN
    SELECT RAISE(FAIL, 'Only one manuscript record allowed');
END;

CREATE TRIGGER opening_analysis_single_record_insert
    BEFORE INSERT ON opening_analysis
    WHEN NEW.id != 'singleton' OR (SELECT COUNT(*) FROM opening_analysis) >= 1
BEGIN
    SELECT RAISE(FAIL, 'Only one opening analysis record allowed');
END;

CREATE TRIGGER submission_analytics_single_record_insert
    BEFORE INSERT ON submission_analytics
    WHEN NEW.id != 'singleton' OR (SELECT COUNT(*) FROM submission_analytics) >= 1
BEGIN
    SELECT RAISE(FAIL, 'Only one submission analytics record allowed');
END;

-- Recreate essential indexes (without manuscript_id references)
CREATE INDEX idx_scenes_index ON scenes(index_in_manuscript);
CREATE INDEX idx_revision_notes_scene_id ON revision_notes(scene_id);
CREATE INDEX idx_scene_analysis_scene_id ON scene_analysis(scene_id);
CREATE INDEX idx_character_voices_character_id ON character_voices(character_id);
CREATE INDEX idx_character_voices_scene_id ON character_voices(scene_id);
CREATE INDEX idx_revision_sessions_started_at ON revision_sessions(started_at);
CREATE INDEX idx_edits_scene_id ON edits(scene_id);
CREATE INDEX idx_edits_session_id ON edits(session_id);
CREATE INDEX idx_edits_created_at ON edits(created_at);
CREATE INDEX idx_edit_patterns_type ON edit_patterns(pattern_type);
CREATE INDEX idx_query_letters_version ON query_letters(version_number);
CREATE INDEX idx_synopses_length_type ON synopses(length_type);
CREATE INDEX idx_agent_database_genres ON agent_database(genres);
CREATE INDEX idx_agent_database_updated_at ON agent_database(updated_at);
CREATE INDEX idx_submission_tracking_agent_id ON submission_tracking(agent_id);
CREATE INDEX idx_submission_tracking_status ON submission_tracking(status);
CREATE INDEX idx_submission_tracking_date ON submission_tracking(submission_date);
CREATE INDEX idx_submission_analytics_period ON submission_analytics(time_period);
CREATE INDEX idx_agent_matching_agent_id ON agent_matching(agent_id);
CREATE INDEX idx_agent_matching_score ON agent_matching(compatibility_score);