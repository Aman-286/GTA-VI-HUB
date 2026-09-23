# GTA VI Hub

A local-first development build of an unofficial GTA VI companion. **Nothing is deployed.** The owner has deferred deployment until next month.

Next.js 16 App Router · React 19 · TypeScript · custom editorial design system · Leaflet · Cloudflare D1 / SQLite · site-owned email/password accounts.

Independent review: [16 September stabilization audit](docs/INDEPENDENT-AUDIT-2026-09-16.md). This records confirmed fixes, feature gaps and reproducible checks. Real browser acceptance remains unverified in that review; prior visual-test claims below are historical.

## Run locally

Requires Node.js 22.14+ (tested on Node 24) and npm.

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Local D1 data lives under `.wrangler/state/v3/d1/` and survives application restarts. Do not delete that directory unless you intend to discard local data. Seeding is repeatable and does not overwrite existing records.

If your Windows environment requires a corporate root certificate, use Node's `--use-system-ca` option. Do not disable TLS verification. The registry's install-script policy is preserved.

## Available workflows

- Homepage, database navigation and useful companion guides, with official Rockstar screenshot accents and a clearly fictional schematic map.
- Search via Ctrl/Cmd+K, recent searches, keyboard selection, grouped record types and an independent search results page.
- Source-backed entity routes for all 14 categories, with domain fields, mission walkthroughs, map links and metadata.
- Query-string category filters, pagination, name sorting and vehicle speed sorting with unknown values last.
- Custom-coordinate Leaflet map with viewport queries, server-side grid clustering, a two-level marker taxonomy (19 categories), region, completion, visit-later and radius filters, per-marker region/unlock/verification/version detail, marker URLs, keyboard-accessible markers, a text directory and a phone bottom sheet.
- Per-category completion summary counted in the database against the same spoiler predicate the map draws with, so a cluster never promises more than it can show.
- D1-backed guest progress and favorites; email/password sign-in and guest-to-account merge.
- Collectible checklist, completed records, favorites, recent views, saved guides, profile name and JSON data export.
- Protected editorial CMS with typed record forms, drafts, preview, duplicate, archive, source attachment, verification controls, revision history and rollback to a new draft.
- CSV validation and preview before explicit import; duplicate detection; atomic batches of at most 50 new drafts.
- Marker creation, selection, dragging, X/Y edits, deletion audit and selection of existing local map image assets.
- Community submissions, evidence links, pending moderation, review notes and approved-contribution reputation events. Approval does **not** automatically create or publish an entity.
- Editor analytics for submitted searches, zero-result terms, result clicks, favorites and recent views; genuine trending data only.
- Site-wide spoiler safety: three reading modes, an optional story position, per-category opt-in, and concealment applied on the server so a hidden title, slug, primary key, body or image never reaches the page. Reveal-once and always-show-this-category controls throughout.
- Source-only future retrieval interface; no model SDK, provider key or AI runtime dependency.

## The map

Markers are records in their own right, not pins borrowing an entity's fields.
Each carries its own region, unlock requirement, verification state, game
version and last-confirmed date, because one record can appear in several
places with different answers. Anything the database does not know is shown as
"Not recorded" rather than guessed.

Filters live in the URL (`?category=&sub=&region=&missing=1&later=1&near=&radius=`)
so a view can be shared, and are applied in SQL rather than after the fact --
the cluster counts come from the same statement, so a filter that narrowed only
the pin list would draw a cluster of seven that opens three.

Reader state is split in two on purpose: `user_progress` answers "have I
finished this record", `user_marker_state` answers "have I been to this place"
and "come back here". One record can have several markers, so collapsing them
into one checkbox would make "hide completed" and "visit later" the same
filter.

## Spoiler safety

Every public read path -- listings, search, the map, record pages, related rails
and their metadata -- resolves the reader's spoiler setting on the server before
composing a response.

- **Modes**: _No spoilers_ (default), _Minor gameplay spoilers_, _Show
  everything_. Editors classify a record as level 0, 1 or 2 with a category.
- **Story position**: a reader may name the mission they have reached. A record
  marked "stops being a spoiler after mission #N" opens for anyone past N
  without changing their mode.
- **Concealment, not blurring**: a hidden record's title, slug, primary key,
  body, category, image and SEO/Open Graph text are not in the response at all.
  A CSS blur would still ship them to screen readers, to view-source and to link
  previews. Concealed records carry an opaque `reveal_token` instead of their id,
  because an id such as `demo-after-hours` spells out the title it is hiding.
- **Listings mask, search omits**: a listing keeps a placeholder row with a
  reveal control; search drops the hit entirely, because a full-text match can
  be caused by a word that only exists in the hidden body. Both report how many
  records they withheld.
- **Storage**: signed-in readers in `user_preferences` / `user_revealed_categories`;
  guests in a readable `hub_spoiler` cookie, adopted into the account on first
  sign-in. The server never trusts a client-supplied story position -- it
  resolves the sequence from the mission the reader picked.

Spoiler safety is a **reading preference, not an access-control boundary**. All
published records are public; the guarantee is that nothing is revealed by
accident. `/api/reveal` honours an explicit request for a named token.

## Demo content

The seed contains **25 fictional game records and 3 original companion guides**. It contains **zero cheat codes**. Fictional missions, vehicles, weapons, locations, characters, collectibles and other game records are visibly labeled DEMO. Statistics and prices remain null rather than invented. Decorative screenshots are official Rockstar GTA VI media, credited separately from fictional records (see docs/MEDIA.md). The map is an original functional coordinate diagram, not GTA VI geography.

Demo entities cannot receive Official, Verified or Community Verified status. Their detail routes are `noindex` and excluded from the sitemap. The three guides explain this application, not unconfirmed game facts.

## Account and editor setup (local)

Guest features and email/password accounts work locally without a provider account. Open /account and choose Create an account. Save the private recovery code shown after registration; password recovery uses this code, not email delivery. Registration preserves the guest user and progress; signing into an existing account merges guest progress and favorites.

To grant your own LOCAL account editorial access after registering:

```sh
node scripts/grant-local-admin.mjs your-account-email
```

This explicit local database command grants an administrator role; registration never grants roles. Administrators can manage other editor/contributor roles through the CMS. No email verification or email delivery is configured. Email is a sign-in identifier, not a verified identity claim. Password changes and recovery rotate the recovery code and revoke existing sessions.

Turnstile is optional for localhost development. Public submissions require configured Turnstile keys.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run test:runtime  # requires the local dev server and local D1
node scripts/test-accounts.mjs
node scripts/test-audit.mjs
node scripts/test-links.mjs
npm run db:validate
npm run build
```

The runtime suite creates uniquely identified fixtures in the explicitly local D1 database, exercises HTTP routes and access control, and removes only its fixtures. Never point it at production. On managed Windows systems, Vitest/esbuild may need permission to resolve through parent directories.

Use `HUB_BASE_URL` to select another loopback port for the HTTP suites. On Windows, stop local Next/Wrangler servers before `build:worker`: an active Worker can hold `.open-next/assets` open and prevent artifact regeneration. `npm run preview -- --port 3000` runs the built Worker locally without deploying.

`npm run build:worker` builds the future Cloudflare artifact **without deploying**. Deployment is deliberately deferred. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) when ready.

## Remaining launch work

- Firefox and Safari rendering, and real touch input on hardware. A production build has now been checked in headless Chromium across 390-1920 px plus 2560 ultrawide (no horizontal overflow, no console errors, no failed requests), with keyboard, focus, error-path, throttled-network and map interaction passes. Safari prefixes and non-`dvh` fallbacks are in place but unexercised in those engines.
- Configure and test Turnstile keys and explicitly grant the owner account an administrator role. Profile the password hashing flow against the eventual host CPU limits; do not reduce password protection to fit a hosting quota.
- Replace fictional data with reviewed sources and licensed assets. Add a monitored owner contact address and review the development Privacy/Terms text before public launch.
- Large editorial datasets need server-side CMS pagination (the current editor loads the latest 100 records; source picker 200 and marker editor 500). The public database is paginated; the map never sends the whole marker set.
- Account overview currently considers up to 1,000 published records. Split this into aggregate counts and paginated saved/completed lists before exceeding that scale.
- Normalized relationship tables are ready; advanced relationship picking, multi-map support, full contributor profiles, image uploads and report triage remain later editorial enhancements.
- WebMCP tools are feature-detected, optional and unverified in an actual supported browser. All ordinary UI workflows work without them.
- Schedule database maintenance when hosting. `db/maintenance.sql` expires sessions and rate-limit buckets and deletes search events older than 30 days.

## Project map

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DESIGN.md](docs/DESIGN.md), [docs/SECURITY.md](docs/SECURITY.md) and [docs/VALIDATION.md](docs/VALIDATION.md).

Unofficial fan-created website. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.
