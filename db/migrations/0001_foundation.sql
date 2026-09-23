PRAGMA foreign_keys=ON;
CREATE TABLE games (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
CREATE TABLE users (id TEXT PRIMARY KEY, github_id TEXT UNIQUE, username TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, display_name TEXT, bio TEXT);
CREATE TABLE roles (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('admin','editor','contributor')), PRIMARY KEY(user_id,role));
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
CREATE TABLE entities (
 id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id), kind TEXT NOT NULL CHECK(kind IN ('missions','vehicles','weapons','characters','locations','collectibles','properties','businesses','activities','secrets','easter-eggs','achievements','guides','cheats')),
 slug TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '',
 verification TEXT NOT NULL DEFAULT 'Unverified' CHECK(verification IN ('Official','Verified','Community Verified','Unverified','Rumor')),
 is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0,1)), status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 seo_title TEXT, meta_description TEXT, image_url TEXT, image_credit TEXT, revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(kind,slug), CHECK(NOT(is_demo=1 AND verification IN ('Official','Verified','Community Verified')))
);
CREATE INDEX idx_entities_listing ON entities(kind,status,updated_at DESC);
CREATE INDEX idx_entities_published ON entities(status,updated_at DESC);
CREATE VIRTUAL TABLE entity_search USING fts5(title, description, body, content='entities',content_rowid='rowid', tokenize='unicode61');
CREATE TRIGGER entities_ai AFTER INSERT ON entities BEGIN INSERT INTO entity_search(rowid,title,description,body) VALUES(new.rowid,new.title,new.description,new.body); END;
CREATE TRIGGER entities_ad AFTER DELETE ON entities BEGIN INSERT INTO entity_search(entity_search,rowid,title,description,body) VALUES('delete',old.rowid,old.title,old.description,old.body); END;
CREATE TRIGGER entities_au AFTER UPDATE ON entities BEGIN INSERT INTO entity_search(entity_search,rowid,title,description,body) VALUES('delete',old.rowid,old.title,old.description,old.body); INSERT INTO entity_search(rowid,title,description,body) VALUES(new.rowid,new.title,new.description,new.body); END;
CREATE TABLE regions (id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id), name TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0);
CREATE TABLE locations (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, region_id TEXT REFERENCES regions(id), x REAL CHECK(x BETWEEN 0 AND 1600), y REAL CHECK(y BETWEEN 0 AND 1000), requirements TEXT);
CREATE TABLE characters (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, role_description TEXT);
CREATE TABLE missions (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, sequence INTEGER, location_id TEXT REFERENCES locations(entity_id), requirements TEXT, rewards TEXT, unlocks TEXT, tips TEXT, missables TEXT);
CREATE TABLE mission_objectives (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(entity_id) ON DELETE CASCADE, position INTEGER NOT NULL, title TEXT NOT NULL, instructions TEXT NOT NULL, UNIQUE(mission_id,position));
CREATE TABLE mission_characters (mission_id TEXT REFERENCES missions(entity_id) ON DELETE CASCADE, character_id TEXT REFERENCES characters(entity_id) ON DELETE CASCADE, PRIMARY KEY(mission_id,character_id));
CREATE TABLE vehicles (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, speed REAL, acceleration REAL, handling REAL, braking REAL, seats INTEGER, price INTEGER, obtain TEXT, customization TEXT);
CREATE TABLE vehicle_locations (vehicle_id TEXT REFERENCES vehicles(entity_id) ON DELETE CASCADE, location_id TEXT REFERENCES locations(entity_id) ON DELETE CASCADE, PRIMARY KEY(vehicle_id,location_id));
CREATE TABLE weapons (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, damage REAL, range REAL, accuracy REAL, fire_rate REAL, magazine INTEGER, obtain TEXT, requirements TEXT, attachments TEXT);
CREATE TABLE weapon_locations (weapon_id TEXT REFERENCES weapons(entity_id) ON DELETE CASCADE, location_id TEXT REFERENCES locations(entity_id) ON DELETE CASCADE, PRIMARY KEY(weapon_id,location_id));
CREATE TABLE collectible_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, game_id TEXT REFERENCES games(id));
CREATE TABLE collectibles (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, category_id TEXT REFERENCES collectible_categories(id), location_id TEXT REFERENCES locations(entity_id), sequence INTEGER);
CREATE TABLE cheats (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, effect TEXT, warning TEXT);
CREATE TABLE cheat_codes (id TEXT PRIMARY KEY, cheat_id TEXT NOT NULL REFERENCES cheats(entity_id) ON DELETE CASCADE, platform TEXT NOT NULL CHECK(platform IN ('PS5','Xbox','Phone')), code TEXT NOT NULL, UNIQUE(cheat_id,platform));
CREATE TABLE properties (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, location_id TEXT REFERENCES locations(entity_id), price INTEGER, requirements TEXT);
CREATE TABLE businesses (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, location_id TEXT REFERENCES locations(entity_id), requirements TEXT);
CREATE TABLE activities (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, location_id TEXT REFERENCES locations(entity_id), requirements TEXT);
CREATE TABLE achievements (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, requirements TEXT, platform TEXT, points INTEGER);
CREATE TABLE guides (entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE, reading_minutes INTEGER, author_id TEXT REFERENCES users(id));
CREATE TABLE entity_relations (entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE, related_id TEXT REFERENCES entities(id) ON DELETE CASCADE, relation TEXT NOT NULL, PRIMARY KEY(entity_id,related_id,relation));
CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE entity_tags (entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE, tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(entity_id,tag_id));
CREATE TABLE sources (id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('Official','Own Gameplay','Community','Publication','Video','Forum','Social','Other')), accessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, notes TEXT);
CREATE TABLE entity_sources (entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE, source_id TEXT REFERENCES sources(id), fact TEXT NOT NULL, PRIMARY KEY(entity_id,source_id));
CREATE TABLE maps (id TEXT PRIMARY KEY, title TEXT NOT NULL, image_url TEXT NOT NULL, width INTEGER NOT NULL CHECK(width>0), height INTEGER NOT NULL CHECK(height>0), is_demo INTEGER NOT NULL DEFAULT 1);
CREATE TABLE map_markers (id TEXT PRIMARY KEY, map_id TEXT NOT NULL REFERENCES maps(id), entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE, category TEXT NOT NULL, x REAL NOT NULL CHECK(x BETWEEN 0 AND 1600), y REAL NOT NULL CHECK(y BETWEEN 0 AND 1000), source_id TEXT REFERENCES sources(id));
CREATE INDEX idx_markers_viewport ON map_markers(map_id,category,x,y);
CREATE TABLE favorites (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,entity_id));
CREATE TABLE user_progress (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE, completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN(0,1)), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,entity_id));
CREATE TABLE recent_views (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE, viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,entity_id));
CREATE TABLE submissions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, entity_id TEXT REFERENCES entities(id), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), review_note TEXT, reviewer_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_submissions_queue ON submissions(status,created_at DESC);
CREATE TABLE submission_evidence (id TEXT PRIMARY KEY, submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE, url TEXT NOT NULL, notes TEXT);
CREATE TABLE revisions (id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE, editor_id TEXT NOT NULL REFERENCES users(id), revision INTEGER NOT NULL, snapshot TEXT NOT NULL, changes TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(entity_id,revision));
CREATE TABLE reports (id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES entities(id), user_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE reputation_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), submission_id TEXT UNIQUE REFERENCES submissions(id), points INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE audit_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, target_id TEXT, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE search_events (id TEXT PRIMARY KEY, query TEXT NOT NULL, result_count INTEGER NOT NULL, clicked_entity_id TEXT REFERENCES entities(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_search_events_created ON search_events(created_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
PRAGMA optimize;
