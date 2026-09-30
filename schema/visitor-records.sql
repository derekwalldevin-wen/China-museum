-- Visitor submissions (phase B): metadata in D1, photos in R2 when available,
-- otherwise in the `data` blob column so the whole flow works before R2 is enabled.
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  museum_name TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  visited_at TEXT,
  note TEXT,
  contributor TEXT NOT NULL,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_at TEXT,
  published_at TEXT,
  photo_count INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  storage TEXT NOT NULL,
  object_key TEXT,
  data BLOB,
  caption TEXT
);

CREATE INDEX IF NOT EXISTS idx_photos_submission ON photos (submission_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status, created_at);

-- Very small per-IP rate limiter (one row per IP per hour window).
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, window_start)
);
