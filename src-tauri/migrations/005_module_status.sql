-- Module Status Tracking for LLM Processing
-- This table tracks which analysis modules need reprocessing for each scene

CREATE TABLE IF NOT EXISTS module_status (
  scene_id TEXT PRIMARY KEY,
  events_v TEXT, events_dirty INTEGER DEFAULT 1,
  plants_v TEXT, plants_dirty INTEGER DEFAULT 1,
  state_v  TEXT, state_dirty  INTEGER DEFAULT 1,
  beats_v  TEXT, beats_dirty  INTEGER DEFAULT 1,
  last_processed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(scene_id) REFERENCES scenes(id)
);

-- Index for efficient dirty scene lookups
CREATE INDEX IF NOT EXISTS idx_module_status_dirty 
ON module_status(events_dirty, plants_dirty, state_dirty, beats_dirty);

-- Index for last processed timestamp
CREATE INDEX IF NOT EXISTS idx_module_status_last_processed 
ON module_status(last_processed);