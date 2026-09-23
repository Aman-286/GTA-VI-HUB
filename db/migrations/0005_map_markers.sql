-- Phase 2: a marker becomes a record in its own right.
--
-- Until now a marker was a pin borrowing everything from its entity, and the
-- detail panel filled the gaps with hard-coded strings ("Demonstration coast",
-- "Fictional sample -- not applicable"). Those are exactly the fields a
-- companion has to be able to state honestly per location: which region, what
-- unlocks it, which game version it was checked against, and when it was last
-- confirmed. They belong to the marker, because one entity can appear in
-- several places with different answers.

-- Game versions are introduced here rather than with the patch tracker because
-- markers, vehicles, weapons and guides all need to say "checked against
-- which build" long before there is a patch list to show.
CREATE TABLE game_versions (
 id TEXT PRIMARY KEY,
 label TEXT NOT NULL UNIQUE,
 released_at TEXT,
 notes TEXT NOT NULL DEFAULT '',
 is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0,1))
);

-- A real marker taxonomy, two levels deep. Previously `map_markers.category`
-- held an entity kind, which cannot express "Stores and services" or
-- "Stunt jumps" -- neither is a kind of record, both are kinds of place.
CREATE TABLE marker_categories (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 parent_id TEXT REFERENCES marker_categories(id),
 description TEXT NOT NULL DEFAULT '',
 position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_marker_categories_parent ON marker_categories(parent_id, position);

ALTER TABLE map_markers ADD COLUMN subcategory TEXT NOT NULL DEFAULT '';
ALTER TABLE map_markers ADD COLUMN region_id TEXT REFERENCES regions(id);
ALTER TABLE map_markers ADD COLUMN unlock_requirements TEXT NOT NULL DEFAULT '';
ALTER TABLE map_markers ADD COLUMN game_version_id TEXT REFERENCES game_versions(id);
ALTER TABLE map_markers ADD COLUMN verified_at TEXT;
ALTER TABLE map_markers ADD COLUMN verification TEXT NOT NULL DEFAULT 'Unverified'
 CHECK(verification IN ('Official','Verified','Community Verified','Unverified','Rumor','Disproved','Outdated'));
-- Set when a marker originates from a community submission rather than the
-- editorial team. Never grants a verification state on its own.
ALTER TABLE map_markers ADD COLUMN created_by TEXT REFERENCES users(id);
ALTER TABLE map_markers ADD COLUMN notes TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_markers_region ON map_markers(map_id, region_id);
CREATE INDEX idx_markers_subcategory ON map_markers(map_id, category, subcategory);

-- Per-marker reader state. Deliberately separate from `user_progress`, which
-- is keyed by entity: one entity can have several markers, and "I have been
-- here" is not the same claim as "I have finished this". Keeping them apart is
-- what lets the map offer "hide completed" and "visit later" as different
-- filters rather than one overloaded checkbox.
CREATE TABLE user_marker_state (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 marker_id TEXT NOT NULL REFERENCES map_markers(id) ON DELETE CASCADE,
 discovered INTEGER NOT NULL DEFAULT 0 CHECK(discovered IN (0,1)),
 visit_later INTEGER NOT NULL DEFAULT 0 CHECK(visit_later IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id, marker_id)
);
CREATE INDEX idx_marker_state_later ON user_marker_state(user_id, visit_later);
CREATE INDEX idx_marker_state_discovered ON user_marker_state(user_id, discovered);

-- The taxonomy itself. The first nine ids match the entity kinds already
-- stored in `map_markers.category`, so existing markers keep working with no
-- data migration; the rest are new kinds of place that had nowhere to live.
INSERT INTO marker_categories(id,name,description,position) VALUES
 ('missions','Missions','Where a mission begins.',10),
 ('collectibles','Collectibles','Items to find and tick off.',20),
 ('vehicles','Vehicles','Where a vehicle can be found or bought.',30),
 ('weapons','Weapons','Where a weapon can be found or bought.',40),
 ('properties','Properties','Places that can be owned.',50),
 ('businesses','Businesses','Places that generate income.',60),
 ('activities','Activities','Things to do between missions.',70),
 ('secrets','Secrets','Hidden things worth finding.',80),
 ('easter-eggs','Easter eggs','References and jokes.',90),
 ('locations','Locations','Named places worth knowing.',100),
 ('services','Stores and services','Shops, garages, barbers and other services.',110),
 ('random-events','Random events','Encounters that appear under the right conditions.',120),
 ('police','Police stations','Police presence and custody points.',130),
 ('hospitals','Hospitals','Respawn and medical points.',140),
 ('wildlife','Wildlife','Where animals are encountered.',150),
 ('stunt-jumps','Stunt jumps','Jumps worth attempting.',160),
 ('interiors','Hidden interiors','Interiors that can be entered.',170),
 ('fast-travel','Fast-travel points','Points that shorten a journey.',180),
 ('community','Community discoveries','Reader-submitted locations, pending review.',190);

INSERT INTO marker_categories(id,name,parent_id,position) VALUES
 ('services-clothing','Clothing','services',10),
 ('services-vehicle','Vehicle services','services',20),
 ('services-food','Food and drink','services',30),
 ('services-weapons','Weapon dealers','services',40),
 ('collectibles-set','Part of a set','collectibles',10),
 ('collectibles-single','One-off find','collectibles',20),
 ('missions-story','Story mission','missions',10),
 ('missions-side','Side mission','missions',20),
 ('wildlife-land','Land animals','wildlife',10),
 ('wildlife-marine','Marine life','wildlife',20);

-- A clearly fictional version label so the "verified against" field has
-- something honest to show in the demonstration data.
INSERT INTO game_versions(id,label,notes,is_demo) VALUES
 ('demo-version','DEMO build','A placeholder version label attached to demonstration records. It does not name a real GTA VI build.',1);
