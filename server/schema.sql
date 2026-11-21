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

-- Accounts (optional for app users). Passwords are stored only as salted PBKDF2-SHA256 hashes.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass TEXT NOT NULL, salt TEXT NOT NULL,
  created TEXT NOT NULL,
  trips INTEGER NOT NULL DEFAULT 0, alarms INTEGER NOT NULL DEFAULT 0,
  saved TEXT,                      -- saved stops (JSON), synced between the user's devices
  settings TEXT,                   -- app settings (JSON)
  fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS install_user (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL);

-- RTA bus timetable: departure minutes after midnight (comma list), weekdays and weekends.
-- Loaded from server/data/bus_departures.sql by the deploy workflow when it changes.
CREATE TABLE IF NOT EXISTS bus_dep (
  stop TEXT NOT NULL, route TEXT NOT NULL, dir INTEGER NOT NULL, headsign TEXT,
  wd TEXT, we TEXT,
  PRIMARY KEY (stop, route, dir)
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
