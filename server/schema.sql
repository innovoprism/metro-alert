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

-- Coins (rewards). owner = 'u:<user id>' for accounts, 'i:<install id>' for people without an account.
CREATE TABLE IF NOT EXISTS wallet (owner TEXT PRIMARY KEY, coins INTEGER NOT NULL DEFAULT 0, earned INTEGER NOT NULL DEFAULT 0, updated TEXT);
-- what was earned per day and reason (enforces daily limits; day '-' = one-time rewards)
CREATE TABLE IF NOT EXISTS coin_log (day TEXT NOT NULL, owner TEXT NOT NULL, reason TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, owner, reason));

-- Verified trips (v2.1): coins are only given when a tracked trip really reaches its stop
CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, owner TEXT, install TEXT, platform TEXT, kind TEXT, dest TEXT, line TEXT,
  started INTEGER NOT NULL, ended INTEGER, from_lat REAL, from_lng REAL, to_lat REAL, to_lng REAL,
  status TEXT NOT NULL DEFAULT 'open', travelled INTEGER, coins INTEGER NOT NULL DEFAULT 0, why TEXT, day TEXT);
CREATE INDEX IF NOT EXISTS trips_owner ON trips (owner, started);
CREATE INDEX IF NOT EXISTS trips_day ON trips (day);
-- one-time: coins from v1.9/v2.0 were counted for opening the app, starting trips and test alarms.
-- Reset every balance; the old log rows are kept, renamed v1_<reason>.
UPDATE wallet SET coins = 0, earned = 0 WHERE NOT EXISTS (SELECT 1 FROM meta WHERE k = 'coins_v2');
UPDATE coin_log SET reason = 'v1_' || reason WHERE reason NOT LIKE 'v1_%' AND NOT EXISTS (SELECT 1 FROM meta WHERE k = 'coins_v2');
INSERT OR IGNORE INTO meta (k, v) VALUES ('coins_v2', datetime('now'));
