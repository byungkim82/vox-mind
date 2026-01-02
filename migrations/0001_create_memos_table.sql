-- Create memos table
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  category TEXT,
  action_items TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_created ON memos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_category ON memos(category);
CREATE INDEX IF NOT EXISTS idx_user_category ON memos(user_id, category);

-- Auto-update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_memos_updated_at
AFTER UPDATE ON memos
FOR EACH ROW
BEGIN
  UPDATE memos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
