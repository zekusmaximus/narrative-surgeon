-- Manuscripts table
CREATE TABLE manuscripts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    genre TEXT,
    target_audience TEXT,
    comp_titles TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    total_word_count INTEGER DEFAULT 0,
    opening_strength_score INTEGER,
    hook_effectiveness INTEGER
);

-- Scenes table
CREATE TABLE scenes (
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

-- Characters table
CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    first_appearance_scene_id TEXT,
    voice_sample TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Revision notes table
CREATE TABLE revision_notes (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL,
    type TEXT,
    content TEXT NOT NULL,
    resolved BOOLEAN DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- Scene Analysis table
CREATE TABLE scene_analysis (
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

-- Opening Analysis table
CREATE TABLE opening_analysis (
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

-- Character Voices table
CREATE TABLE character_voices (
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

-- Pacing Analysis table
CREATE TABLE pacing_analysis (
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

-- Revision Sessions table
CREATE TABLE revision_sessions (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    session_type TEXT,
    focus_area TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    scenes_revised INTEGER DEFAULT 0,
    words_changed INTEGER DEFAULT 0,
    quality_delta INTEGER,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Edits table
CREATE TABLE edits (
    id TEXT PRIMARY KEY,
    scene_id TEXT NOT NULL,
    session_id TEXT,
    edit_type TEXT,
    before_text TEXT NOT NULL,
    after_text TEXT,
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    rationale TEXT,
    impact_score INTEGER,
    affects_plot BOOLEAN DEFAULT 0,
    affects_character BOOLEAN DEFAULT 0,
    affects_pacing BOOLEAN DEFAULT 0,
    created_at INTEGER NOT NULL,
    applied_at INTEGER,
    reverted_at INTEGER,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES revision_sessions(id) ON DELETE SET NULL
);

-- Edit Patterns table
CREATE TABLE edit_patterns (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    pattern_type TEXT,
    pattern_text TEXT,
    frequency INTEGER,
    severity INTEGER,
    auto_fix_available BOOLEAN,
    suggested_alternatives TEXT,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Comp Analysis table
CREATE TABLE comp_analysis (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    comp_title TEXT NOT NULL,
    comp_author TEXT,
    opening_similarity INTEGER,
    pacing_similarity INTEGER,
    voice_similarity INTEGER,
    structure_similarity INTEGER,
    market_position TEXT,
    key_differences TEXT,
    key_similarities TEXT,
    analyzed_at INTEGER,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Beta Reader Personas table
CREATE TABLE beta_reader_personas (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    persona_type TEXT,
    expectations TEXT,
    likely_reactions TEXT,
    engagement_curve TEXT,
    would_continue_reading BOOLEAN,
    would_recommend BOOLEAN,
    primary_criticism TEXT,
    primary_praise TEXT,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Query Letters table
CREATE TABLE query_letters (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
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
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Synopses table
CREATE TABLE synopses (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    length_type TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    content TEXT NOT NULL,
    structural_beats TEXT,
    character_arcs TEXT,
    genre_elements TEXT,
    optimization_score INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Sample Pages table
CREATE TABLE sample_pages (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    page_count INTEGER NOT NULL,
    format_type TEXT NOT NULL,
    content TEXT NOT NULL,
    font_settings TEXT,
    margin_settings TEXT,
    header_settings TEXT,
    industry_standard TEXT,
    file_path TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Agent Database table
CREATE TABLE agent_database (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agency TEXT,
    genres TEXT,
    client_list TEXT,
    submission_guidelines TEXT,
    response_time_days INTEGER,
    acceptance_rate REAL,
    client_success_stories TEXT,
    social_media_handles TEXT,
    interview_quotes TEXT,
    manuscript_wishlist TEXT,
    recent_deals TEXT,
    query_preferences TEXT,
    red_flags TEXT,
    updated_at INTEGER NOT NULL
);

-- Submission Tracking table
CREATE TABLE submission_tracking (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
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
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agent_database(id),
    FOREIGN KEY (query_letter_id) REFERENCES query_letters(id),
    FOREIGN KEY (synopsis_id) REFERENCES synopses(id),
    FOREIGN KEY (sample_pages_id) REFERENCES sample_pages(id)
);

-- Submission Analytics table
CREATE TABLE submission_analytics (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
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
    calculated_at INTEGER NOT NULL,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

-- Agent Matching table
CREATE TABLE agent_matching (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
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
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agent_database(id)
);

-- Create indexes for performance
CREATE INDEX idx_scenes_manuscript_id ON scenes(manuscript_id);
CREATE INDEX idx_scenes_index ON scenes(index_in_manuscript);
CREATE INDEX idx_characters_manuscript_id ON characters(manuscript_id);
CREATE INDEX idx_revision_notes_scene_id ON revision_notes(scene_id);
CREATE INDEX idx_scene_analysis_scene_id ON scene_analysis(scene_id);
CREATE INDEX idx_opening_analysis_manuscript_id ON opening_analysis(manuscript_id);
CREATE INDEX idx_character_voices_character_id ON character_voices(character_id);
CREATE INDEX idx_character_voices_scene_id ON character_voices(scene_id);
CREATE INDEX idx_pacing_analysis_manuscript_id ON pacing_analysis(manuscript_id);
CREATE INDEX idx_revision_sessions_manuscript_id ON revision_sessions(manuscript_id);
CREATE INDEX idx_revision_sessions_started_at ON revision_sessions(started_at);
CREATE INDEX idx_edits_scene_id ON edits(scene_id);
CREATE INDEX idx_edits_session_id ON edits(session_id);
CREATE INDEX idx_edits_created_at ON edits(created_at);
CREATE INDEX idx_edit_patterns_manuscript_id ON edit_patterns(manuscript_id);
CREATE INDEX idx_edit_patterns_type ON edit_patterns(pattern_type);
CREATE INDEX idx_comp_analysis_manuscript_id ON comp_analysis(manuscript_id);
CREATE INDEX idx_beta_reader_personas_manuscript_id ON beta_reader_personas(manuscript_id);
CREATE INDEX idx_query_letters_manuscript_id ON query_letters(manuscript_id);
CREATE INDEX idx_query_letters_version ON query_letters(version_number);
CREATE INDEX idx_synopses_manuscript_id ON synopses(manuscript_id);
CREATE INDEX idx_synopses_length_type ON synopses(length_type);
CREATE INDEX idx_sample_pages_manuscript_id ON sample_pages(manuscript_id);
CREATE INDEX idx_agent_database_genres ON agent_database(genres);
CREATE INDEX idx_agent_database_updated_at ON agent_database(updated_at);
CREATE INDEX idx_submission_tracking_manuscript_id ON submission_tracking(manuscript_id);
CREATE INDEX idx_submission_tracking_agent_id ON submission_tracking(agent_id);
CREATE INDEX idx_submission_tracking_status ON submission_tracking(status);
CREATE INDEX idx_submission_tracking_date ON submission_tracking(submission_date);
CREATE INDEX idx_submission_analytics_manuscript_id ON submission_analytics(manuscript_id);
CREATE INDEX idx_submission_analytics_period ON submission_analytics(time_period);
CREATE INDEX idx_agent_matching_manuscript_id ON agent_matching(manuscript_id);
CREATE INDEX idx_agent_matching_agent_id ON agent_matching(agent_id);
CREATE INDEX idx_agent_matching_score ON agent_matching(compatibility_score);