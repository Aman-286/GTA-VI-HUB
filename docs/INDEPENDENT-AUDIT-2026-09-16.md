# Independent implementation audit — 16 September 2026

The application is a working, database-backed companion foundation, not the complete GTA VI Hub described in the requested feature list. Its accounts, editorial workflow, search, progress storage and schematic map have substantial real implementation. Several broader companion features have no implementation. Confirmed security, spoiler and persistence defects were fixed without replacing the architecture or redesigning the site.

**Scope and evidence.** Inspected all source/configuration paths, migrations, existing tests, README and architecture/security/deployment/validation notes. Initial environment: Windows, Node 24.19.0, npm 11.17.0, Next.js 16.3.3, React 19, TypeScript, custom email/password authentication, Leaflet, SQLite/D1 and OpenNext/Cloudflare Workers. GitHub OAuth is retired. No `.git` directory exists, so branch, commit, recent history and Claude's exact diff cannot be established. File hashes were recorded before editing in `audit/baseline-hashes.json`; the current file-change inventory is in `audit/changed-files.json`. Prior completion claims were not accepted as test evidence.

**Browser limitation.** The connected browser inventory returned no browsers or apps, and creating an in-app browser returned `Browser is not available: iab`, including after permissions were expanded. No browser journey, screenshot, console, hydration, viewport overflow, screen-reader, keyboard or touch result is claimed as manually verified. HTTP tests execute real server/database behavior; they do not prove client interaction or rendering. Previous README claims of Chromium testing remain historical, unverified claims for this audit.

**Confirmed defects and fixes**

| Issue | Change and regression evidence |
| --- | --- |
| Stored XSS in record JSON-LD | The old `"\u003c"` replacement evaluated to `<` and did not escape closing script tags. Added `serializeStructuredData`, with unit and actual rendered-HTML tests using a malicious editorial title. |
| Credential-change/session race | Credential replacement and session revocation now share an atomic D1 batch. Session issuance checks the password hash that was actually verified, preventing an in-flight login using old credentials from restoring access. Concurrent recovery has one winner and one surviving session. |
| Concurrent moderation audit/reputation errors | The pending-state update controls whether audit and reputation rows are inserted. A losing decision returns 409, records no false audit decision and awards no reputation. |
| Host-derived mutation origins | Production mutation authorization now uses configured `SITE_URL`, with a loopback-only development exception. Caller-controlled Host/request origins do not expand the production allowlist. |
| Unbounded request reads | JSON bodies are read incrementally with a byte limit, including requests without Content-Length and multibyte UTF-8. |
| Email administrators incorrectly rejected | Removed the obsolete GitHub-only administrator requirement. Tests cover guests, ordinary accounts, contributors, editors and administrators, including role grants/revocations. |
| Spoilers exposed by account pages, progress, homepage and category filters | Applied the existing server spoiler predicate to these reads. Filtered listings omit hidden matches; unfiltered listings retain safe reveal controls. Trending user search text is withheld while spoiler protection is enabled. |
| Story picker disclosed descriptive IDs | Picker values and responses now use opaque reveal tokens; the server still resolves mission sequence. Existing ID-based requests remain accepted for compatibility. |
| Map responses could enter a shared cache | All map responses use `private, no-store`, including readers who allow all spoilers. |
| Hidden marker location/metadata leaked | Concealed deep links omit real coordinates and sensitive metadata. Explicit token-based reveal returns complete marker details. |
| Guest map flags lost on account login | Discovered/visit-later flags merge into existing accounts without clearing flags already saved there. |
| Guest category opt-ins overrode account decisions | First-login adoption no longer adds category reveals to accounts that already have preferences. |
| Client state could retain older spoiler data | Preference changes notify progress/map/reveal components; stale progress responses are ignored and map-detail requests are invalidated. Browser verification remains outstanding. |
| Anonymous visit-later showed all markers | Returns an empty saved list. The old integration assertion explicitly expected all markers; it was replaced with a stricter assertion requiring zero markers and clusters. |
| Hidden-only categories disappeared from map summaries | Visibility is applied before joining category counts; empty categories remain present with zero counts. |
| CSV imports lacked reveal tokens | New imports mint tokens. Migration `0006_repair_reveal_tokens.sql` repairs only missing historical tokens, preserving existing tokens and records. |
| Vulnerable development dependencies | Upgraded Vitest to 4.1.11 and Wrangler to 4.132.0, with its patched Sharp dependency. Final registry audit reports zero known advisories. No forced audit fix or security suppression was used. |
| Account test could cross a fixed-window boundary | The rate-limit test starts with enough time to complete within one minute. Application limits are unchanged. |
| Existing runtime suite leaked two guest fixtures per run | Both created guest IDs now enter its cleanup registry. Six identified fixtures from three runs after the backup were removed with identity/timestamp/state guards; unrelated users were preserved. A subsequent suite run leaves no application-data differences. |

The relevant dependency advisories are [Vitest's redirect-mock file-read advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) and [Sharp's libheif advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c). Their presence in the dependency tree did not establish exploitability through this application's public routes.

**Feature classification after fixes**

“Partially implemented” below also identifies where a real backend exists but the requested broader feature does not. No feature is called complete merely because a page or database table exists.

| Major feature | Classification | Evidence / remaining gap |
| --- | --- | --- |
| Site-wide spoiler controls | Partially implemented | Three modes, story thresholds, category opt-ins and reveal tokens work in HTTP tests. Client transitions and all incidental metadata need browser acceptance. |
| Spoiler-safe search and APIs | Partially implemented | Covered search/account/progress/map/category/home paths pass regression tests. Explicit account JSON export includes the owner's raw saved IDs and submissions; it is not a spoiler-filtered reading surface. Search filters after a 24-hit raw limit, which can starve visible results in a larger mixed dataset. |
| Interactive map and filters | Partially implemented | Real Leaflet controller and SQL viewport/category/subcategory/region/nearby/personal filters; 10,000-marker API exercise passes. Geography is explicitly fictional; marker text search covers currently loaded markers. Real browser interaction unverified. |
| Marker completion and favorites | Impossible to verify with the current environment | APIs and D1 persistence are verified, including account isolation and guest merges. Click/reload interaction cannot be claimed without a browser. |
| Saved routes and route planning | Not implemented | Nearby-radius filtering is present; no route model, saved route endpoints or route planner. |
| Account progress dashboard | Partially implemented | Real completion/favorites/recent lists, profile naming and export. Record loading is capped at 1,000; no game-state integration or broader planner progress. |
| “What should I do next?” recommendations | Not implemented | No recommendation workflow or endpoint; references in comments are not an implementation. |
| Missions and preparation checklists | Partially implemented | Mission pages, walkthrough objectives and whole-record completion exist. Per-objective/preparation persistence is absent. |
| Choices and consequences | Not implemented | No decision-state or consequence workflow. |
| “Can I still get this?” checker | Not implemented | No eligibility evaluator or account-dependent missable checker. |
| Vehicle encyclopedia and garage planner | Partially implemented | Typed vehicle records and browsing exist, with demo/unknown data labels. No persistent garage or planner. |
| Weapons and loadout builder | Partially implemented | Typed weapon records exist. No loadout model or save workflow. |
| Properties/business calculators | Partially implemented | Record types and descriptive fields exist; no income, purchase or break-even calculator. |
| Achievements/missable warnings | Partially implemented | Achievement records and mission missables text exist; no progress-dependent warning engine. |
| Verification/evidence system | Partially implemented | Evidence attachment and source-based publishing checks work. Official/Verified/Community Verified/Unverified/Rumor and DEMO exist; Disproved and Outdated do not. Entity-wide verification dates/versions are incomplete; map metadata has version/date fields. |
| Community submissions/moderation | Partially implemented | Pending submissions, evidence, approval/rejection, notes, audit and reputation are persisted and tested. Approval does not publish. External Turnstile and browser form interaction are unverified. |
| Universal search | Partially implemented | FTS search across records, a search page and command dialog exist. Keyboard/focus behavior unverified; there are no missing-domain tools to search. |
| Mobile second-screen mode | Partially implemented | Responsive navigation/map sheet CSS exists. No dedicated second-screen mode or device synchronization interface. |
| Story timeline | Not implemented | Mission sequence and spoiler story-position selection are not a timeline. |
| Patch tracker | Not implemented | A game-version table/map label is not a patch ingestion/history workflow. |
| Community functionality | Partially implemented | Accounts, contribution submission and moderation exist. No forums, comments, social feed or public contributor-profile workflow. |
| Screenshot-location finder foundation | Not implemented | No screenshot input, image indexing, matching or location-retrieval pipeline. The text-only verified retrieval helper is unrelated. |
| Administration tools | Partially implemented | Real CMS CRUD, evidence, revisions, rollback, import, map editing and roles. Lists are capped; map editor cannot maintain all extended marker metadata/taxonomy. Image-path validation checks syntax rather than asset existence. |
| Accessibility | Impossible to verify with the current environment | Source includes Radix dialogs, labels, focus styles, skip navigation and reduced-motion handling. Actual keyboard/screen-reader behavior, contrast and touch targets unverified; account tabs lack a full arrow-key tab pattern. |
| Responsive design | Impossible to verify with the current environment | Breakpoints and mobile map sheet exist. No independently verified viewport screenshots or overflow/zoom checks. |
| Security/privacy | Partially implemented | Important server boundaries and confirmed vulnerabilities addressed. This is not a penetration-test certification; production proxy behavior, retention execution, deletion workflow, Turnstile and strict CSP remain launch work. |
| Performance | Partially implemented | SQL clustering, bounded output, indexed listings and controller race/coalescing tests exist. No client FPS, mobile CPU, layout-shift or production-quota measurements. |

**Verification results**

| Check | Result |
| --- | --- |
| Initial baseline | Formatting, lint, typecheck, 49 unit tests and standard Next build passed. Existing HTTP suite passed 69 checks before adding targeted coverage. |
| Dependency installation | `npm ls --depth=0` passed. Patched dependencies installed with `npm install --ignore-scripts`; native tools were subsequently exercised by tests/builds. TLS verification stayed enabled; Node system CAs resolved the registry certificate issue. |
| Final formatting/lint/types | `npm run format:check`, `npm run lint`, `npm run typecheck`: passed. No new lint-rule disabling; `.local` generated backups/cache are excluded alongside existing build artifacts. |
| Unit/SQL tests | `npm test`: 63 tests passed across eight files, including migration preservation, FTS consistency, origin/body limits, role/session races and JSON-LD escaping. |
| Existing application integration | `node scripts/test-runtime.mjs`: 69 HTTP checks passed on the built Worker. |
| Authentication integration | `node scripts/test-accounts.mjs`: 22 HTTP checks passed on the built Worker. |
| Targeted audit regressions | `node scripts/test-audit.mjs`: 46 checks passed on the built Worker. |
| Routes/assets | `node scripts/test-links.mjs`: 39 linked HTML routes and seven server-rendered image URLs passed. This is not a JavaScript/browser crawl. |
| Migration/database | Migration 0006 applied locally after a consistent backup. SQLite integrity, foreign keys and FTS integrity passed; 29 existing entities and 23 existing markers retained after fixture cleanup. All six migrations recorded; zero missing reveal tokens. |
| Production builds | `npm run build` passed; `npm run build:worker` passed, including a fresh Next build after the final source fix. Worker preview ran with local D1 and local assets; no deployment occurred. |
| Dependency advisory audit | `npm audit --json`: zero known vulnerabilities after updates. |
| Source secret scan | No common private-key/provider-token signatures found in inspected source/configuration. Git history could not be scanned because it is absent. |
| Browser/E2E | Blocked by absent connected browser. No manual desktop/mobile journeys or clean-console claim. |

The final HTTP suites total **137 checks**, plus the route/image crawl. On local Worker preview, the three 10,000-marker queries took **34/43/54 ms** including HTTP and each returned no more than 90 detailed markers and 250 clusters. These are single-run local measurements, not a production latency guarantee. Synthetic markers were deleted afterward. An initial Cloudflare build failure was a Windows file lock from active local servers; stopping those project servers resolved it. OpenNext still warns about Windows support. Vitest emits an unsuppressed advisory about future native config loading; the current test run passes.

**Working journeys demonstrated through HTTP and persistent storage**

Guest page browsing; guest sessions; registration; case-insensitive login; session rotation/readback; recovery-code rotation and replay rejection; concurrent recovery; password changes and other-session revocation; completion/favorites; hidden search/list/detail content; spoiler preferences/story thresholds/category opt-ins; map filters and marker flags; guest-to-account merging; dashboard data; submission creation, approval/rejection and audit; editor/admin role boundaries; CMS publication/revisions/rollback/import; invalid IDs, cross-origin requests, rate limits and private-account isolation. Persistence was proven by fresh requests and database queries, not browser reloads.

No real-browser journey was manually verified. Saved routes, recommendations, individual mission-checklist steps, garages and loadouts could not be exercised because they are absent.

**Changed files and data preservation**

Application changes are concentrated in auth/session and HTTP helpers; account/progress/preferences/admin/map APIs; account/list/detail pages; homepage activity; spoiler/map/progress components; and the new structured-data serializer. See `audit/changed-files.json` for the complete file inventory. Regression files added: `tests/http.test.ts`, `tests/session.test.ts`, `tests/migrations.test.ts`, `tests/structured-data.test.ts`, `scripts/test-audit.mjs`, `scripts/test-links.mjs`, and `scripts/validate-local-db.mjs`. Existing runtime/account scripts were extended, and package scripts/dependency lockfiles updated. Documentation now points to this independent record.

Only migration `db/migrations/0006_repair_reveal_tokens.sql` was added; earlier migrations and the seed were not rewritten. It updates missing tokens only, with no table drops or record deletion. The local database backup is `.local/audit-backup-1789548851916.sqlite`; it contains private local account data and is excluded from Git. After cleanup and a fresh runtime-suite run, all rows in 49 application tables match that backup exactly (`audit/data-preservation.log`), excluding rate-limit buckets, migration bookkeeping, SQLite sequence and FTS internals. Tests create uniquely scoped local fixtures and remove only those fixtures. No user account was granted an administrative role; role changes were confined to disposable test accounts. No site was published.

**Three highest-priority next actions**

1. Connect a browser and finish desktop/mobile acceptance, especially account forms, spoiler changes while requests are in flight, map selection/reveal/persistence, moderation controls, keyboard focus and error states. Add a maintained browser E2E suite.
2. Define the next product milestone around the missing workflows: saved routes, recommendations, objective checklists, garage/loadouts and missable logic. Supply reviewed real-game data and complete evidence states before presenting those features as available.
3. Complete launch validation in the intended production environment: authenticated Cloudflare configuration, Turnstile, trusted site origin, real scrypt CPU/quota measurements, backups/retention/deletion/contact procedures and reviewed licensed content. Restore Git history/version control so future reviews have an attributable diff.
