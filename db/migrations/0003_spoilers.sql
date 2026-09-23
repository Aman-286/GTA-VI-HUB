-- Phase 1: site-wide spoiler safety.
--
-- Concealment is a *content* property, not an access-control property. It is
-- resolved on the server so that listings, search and the map never place a
-- hidden title, description or image into the response at all -- blurring in
-- CSS would still ship the text to screen readers, to "view source" and to
-- social-card scrapers.
--
-- spoiler_level: 0 nothing to hide, 1 minor gameplay detail, 2 story content.
-- spoiler_category groups records so a reader can permanently opt in to one
-- kind of reveal ("endings", "character fates") without lifting the rest.
-- reveal_after_sequence is the story position at which a record stops being a
-- spoiler for a reader who has already played that far; NULL means it never
-- stops on progress alone.
ALTER TABLE entities ADD COLUMN spoiler_level INTEGER NOT NULL DEFAULT 0 CHECK(spoiler_level IN (0,1,2));
ALTER TABLE entities ADD COLUMN spoiler_category TEXT NOT NULL DEFAULT '';
ALTER TABLE entities ADD COLUMN reveal_after_sequence INTEGER;

-- Safe surfaces. A spoiler record still needs *something* renderable in a
-- list, and the real title is frequently the spoiler itself ("The death of
-- ..."). These columns hold the editor-written stand-ins. When they are null
-- the application falls back to a generic label rather than the real title.
ALTER TABLE entities ADD COLUMN safe_title TEXT;
ALTER TABLE entities ADD COLUMN safe_description TEXT;

CREATE INDEX idx_entities_spoiler ON entities(spoiler_level, status);

-- One preferences row per user. Guests carry the same three values in a
-- readable cookie so server rendering can conceal before the first paint.
CREATE TABLE user_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 spoiler_mode TEXT NOT NULL DEFAULT 'none' CHECK(spoiler_mode IN ('none','minor','all')),
 story_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
 story_sequence INTEGER,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- "Always show this category" lives in its own table rather than a JSON column,
-- matching the project's rule that JSON is reserved for immutable snapshots.
CREATE TABLE user_revealed_categories (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 category TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id, category)
);

-- Known spoiler categories, so the settings panel can offer real choices and
-- an editor cannot invent an unlabelled one per record.
CREATE TABLE spoiler_categories (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT ''
);
INSERT INTO spoiler_categories(id,name,description) VALUES
 ('story','Story events','Plot developments, mission outcomes and how the narrative unfolds.'),
 ('character','Character details','Who someone turns out to be, their allegiances and what becomes of them.'),
 ('ending','Endings','Final missions, final choices and their outcomes.'),
 ('location','Late-game locations','Places that only become reachable later in the story.'),
 ('mechanic','Systems and unlocks','Abilities, equipment and features the story unlocks later.'),
 ('side-content','Side content','Optional activities whose existence is itself a surprise.');
