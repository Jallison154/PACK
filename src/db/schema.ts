export const DB_NAME = 'pack_db'
export const DB_VERSION = 7

export const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workspace TEXT DEFAULT 'work',
    phone TEXT,
    email TEXT,
    company TEXT,
    company_id TEXT,
    job_title TEXT,
    where_met TEXT,
    event TEXT,
    city TEXT,
    state TEXT,
    location_id TEXT,
    date_met TEXT,
    notes TEXT,
    relationship_type TEXT,
    household_id TEXT,
    home_address TEXT,
    work_location TEXT,
    last_seen_at TEXT,
    last_seen_date TEXT,
    last_interaction_notes TEXT,
    profile_color TEXT DEFAULT '#52525B',
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1,
    deleted_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT,
    interaction_type TEXT,
    notes TEXT,
    next_follow_up TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    latitude REAL,
    longitude REAL,
    category TEXT,
    notes TEXT,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    city TEXT,
    state TEXT,
    type TEXT,
    created_at TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS person_tags (
    person_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (person_id, tag_id),
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    shared_notes TEXT,
    pets TEXT,
    general_notes TEXT,
    created_at TEXT NOT NULL,
    sync_version INTEGER DEFAULT 1
  )`,

  `CREATE INDEX IF NOT EXISTS idx_people_name ON people(name)`,
  `CREATE INDEX IF NOT EXISTS idx_people_company ON people(company)`,
  `CREATE INDEX IF NOT EXISTS idx_people_date_met ON people(date_met)`,
  `CREATE INDEX IF NOT EXISTS idx_people_favorite ON people(is_favorite)`,
  `CREATE INDEX IF NOT EXISTS idx_people_workspace ON people(workspace)`,
  `CREATE INDEX IF NOT EXISTS idx_people_household ON people(household_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(person_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(date)`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_notes ON interactions(notes)`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_location ON interactions(location)`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_follow_up ON interactions(next_follow_up)`,

  `CREATE INDEX IF NOT EXISTS idx_people_last_seen_at ON people(last_seen_at)`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type)`,

  // v2 migrations for existing databases
  `ALTER TABLE people ADD COLUMN workspace TEXT DEFAULT 'work'`,
  `ALTER TABLE people ADD COLUMN household_id TEXT`,

  // v3 — last seen & location fields
  `ALTER TABLE people ADD COLUMN home_address TEXT`,
  `ALTER TABLE people ADD COLUMN work_location TEXT`,
  `ALTER TABLE people ADD COLUMN last_seen_at TEXT`,
  `ALTER TABLE people ADD COLUMN last_seen_date TEXT`,
  `ALTER TABLE people ADD COLUMN last_interaction_notes TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_places_name ON places(name)`,
  `CREATE INDEX IF NOT EXISTS idx_places_category ON places(category)`,
  `CREATE INDEX IF NOT EXISTS idx_places_favorite ON places(is_favorite)`,
  `CREATE INDEX IF NOT EXISTS idx_people_where_met_place ON people(where_met_place_id)`,
  `CREATE INDEX IF NOT EXISTS idx_people_last_seen_place ON people(last_seen_place_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interactions_place ON interactions(place_id)`,

  // v4 — places feature
  `ALTER TABLE people ADD COLUMN where_met_place_id TEXT`,
  `ALTER TABLE people ADD COLUMN last_seen_place_id TEXT`,
  `ALTER TABLE interactions ADD COLUMN place_id TEXT`,
  `INSERT OR IGNORE INTO places (id, name, city, state, category, created_at, sync_version)
   SELECT id, name, city, state, type, created_at, sync_version FROM locations`,
  `UPDATE people SET where_met_place_id = location_id WHERE where_met_place_id IS NULL AND location_id IS NOT NULL`,

  // v5 — interaction event field
  `ALTER TABLE interactions ADD COLUMN event TEXT`,

  // v6 — offline sync queue
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    attempts INTEGER DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at)`,

  // v7 — place timestamps and soft delete
  `ALTER TABLE places ADD COLUMN updated_at TEXT`,
  `ALTER TABLE places ADD COLUMN deleted_at TEXT`,
  `UPDATE places SET updated_at = created_at WHERE updated_at IS NULL`,
]
