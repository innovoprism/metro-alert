-- Metro Alert database (Cloudflare D1 / SQLite). Safe to run again.
-- Anonymous: an install id is a random number made by the app, nothing personal is stored.
CREATE TABLE IF NOT EXISTS installs (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,          -- web | android | ios
  version TEXT,                    -- app (web code) version
  native TEXT,                     -- installed app binary version (phone apps)
  first_seen TEXT NOT NULL,        -- YYYY-MM-DD (Dubai)
  last_seen TEXT NOT NULL,
  opens INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS installs_first ON installs(first_seen);
CREATE INDEX IF NOT EXISTS installs_last ON installs(last_seen);

CREATE TABLE IF NOT EXISTS active (
  day TEXT NOT NULL, id TEXT NOT NULL, platform TEXT NOT NULL,
  PRIMARY KEY (day, id)
);

CREATE TABLE IF NOT EXISTS events (
  day TEXT NOT NULL, platform TEXT NOT NULL, name TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, platform, name)
);

-- Learned stop-to-stop times from real rides (crowd sourced), per time-of-day bucket.
-- key = "M|From|To" (Metro) or "B<route>|From|To" (bus); run = seconds moving, dwell = seconds stopped at From
CREATE TABLE IF NOT EXISTS seg (
  key TEXT NOT NULL, bucket TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0, run REAL NOT NULL, dwell REAL,
  updated TEXT NOT NULL,
  PRIMARY KEY (key, bucket)
);
