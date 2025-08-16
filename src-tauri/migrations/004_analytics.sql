-- Analytics and performance tracking tables

-- Writing session analytics
CREATE TABLE IF NOT EXISTS writing_sessions (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    words_added INTEGER DEFAULT 0,
    words_deleted INTEGER DEFAULT 0,
    scenes_created INTEGER DEFAULT 0,
    scenes_modified INTEGER DEFAULT 0,
    time_active_ms INTEGER DEFAULT 0,  -- Time actually typing/editing
    time_paused_ms INTEGER DEFAULT 0,  -- Time idle
    productivity_score REAL DEFAULT 0.0,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts (id) ON DELETE CASCADE
);

-- Performance metrics for optimization
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL, -- 'search', 'export', 'analysis', etc.
    manuscript_id TEXT,
    execution_time_ms INTEGER NOT NULL,
    memory_usage_mb REAL,
    cpu_usage_percent REAL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    parameters TEXT, -- JSON string of operation parameters
    created_at INTEGER NOT NULL,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts (id) ON DELETE CASCADE
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT NOT NULL, -- 'string', 'number', 'boolean', 'json'
    category TEXT, -- 'editor', 'export', 'theme', 'shortcuts', etc.
    updated_at INTEGER NOT NULL
);

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id TEXT PRIMARY KEY,
    feature_name TEXT NOT NULL,
    manuscript_id TEXT,
    usage_count INTEGER DEFAULT 1,
    last_used_at INTEGER NOT NULL,
    average_duration_ms INTEGER,
    user_rating INTEGER, -- 1-5 star rating for feature usefulness
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts (id) ON DELETE CASCADE
);

-- Error logging for debugging
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    manuscript_id TEXT,
    user_action TEXT,
    app_version TEXT,
    platform TEXT,
    created_at INTEGER NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (manuscript_id) REFERENCES manuscripts (id) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_writing_sessions_manuscript ON writing_sessions(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_writing_sessions_started_at ON writing_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_last_used ON feature_usage(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Views for analytics
CREATE VIEW IF NOT EXISTS daily_writing_stats AS
SELECT 
    date(started_at / 1000, 'unixepoch') as writing_date,
    manuscript_id,
    COUNT(*) as sessions,
    SUM(words_added) as total_words_added,
    SUM(words_deleted) as total_words_deleted,
    SUM(time_active_ms) / 1000 / 60 as active_minutes,
    AVG(productivity_score) as avg_productivity
FROM writing_sessions
WHERE ended_at IS NOT NULL
GROUP BY date(started_at / 1000, 'unixepoch'), manuscript_id
ORDER BY writing_date DESC;

CREATE VIEW IF NOT EXISTS performance_summary AS
SELECT 
    operation_type,
    COUNT(*) as total_operations,
    AVG(execution_time_ms) as avg_time_ms,
    MIN(execution_time_ms) as min_time_ms,
    MAX(execution_time_ms) as max_time_ms,
    AVG(memory_usage_mb) as avg_memory_mb,
    (COUNT(*) FILTER (WHERE success = TRUE) * 100.0 / COUNT(*)) as success_rate
FROM performance_metrics
GROUP BY operation_type
ORDER BY avg_time_ms DESC;

CREATE VIEW IF NOT EXISTS popular_features AS
SELECT 
    feature_name,
    SUM(usage_count) as total_usage,
    COUNT(DISTINCT manuscript_id) as manuscripts_using,
    AVG(user_rating) as avg_rating,
    MAX(last_used_at) as last_used
FROM feature_usage
GROUP BY feature_name
ORDER BY total_usage DESC;

-- Insert default preferences
INSERT OR IGNORE INTO user_preferences (key, value, type, category, updated_at) VALUES
('theme', 'light', 'string', 'appearance', strftime('%s', 'now') * 1000),
('font_family', 'Times New Roman', 'string', 'editor', strftime('%s', 'now') * 1000),
('font_size', '12', 'number', 'editor', strftime('%s', 'now') * 1000),
('auto_save_interval', '300000', 'number', 'editor', strftime('%s', 'now') * 1000),
('spell_check_enabled', 'true', 'boolean', 'editor', strftime('%s', 'now') * 1000),
('word_count_goal', '2000', 'number', 'writing', strftime('%s', 'now') * 1000),
('export_format_default', 'docx', 'string', 'export', strftime('%s', 'now') * 1000),
('analytics_enabled', 'true', 'boolean', 'privacy', strftime('%s', 'now') * 1000);