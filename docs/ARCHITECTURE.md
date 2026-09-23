# Architecture decision record

The repository was empty on inspection. This is a real Next.js App Router application, using React, TypeScript, custom CSS design tokens, Leaflet, and D1. OpenNext builds the Next.js server for Cloudflare Workers. No paid service, AI API, email provider, external tiles, or object store is required.

The brief explicitly requires Next.js; the Sites Vinext starter is therefore not used. Deployment targets the owner's Cloudflare Free account. Free quotas are capacity ceilings, not a promise of unlimited hosting. R2 remains optional because its metered overages conflict with a strict zero-bill guarantee.

## Boundaries

- `src/app`: server-rendered routes, metadata and API handlers.
- `src/components`: shared design system, search, map, entity and editorial tools.
- `src/lib/db`: prepared D1 queries and narrow relational repository.
- `src/lib/auth`: email/password hashing, opaque database sessions, server-side authorization. GitHub OAuth endpoints only redirect to the account page.
- `src/lib/content`: validation and source-based publishing policy.
- `src/lib/spoilers`: spoiler policy (`policy.ts`, pure), record masking
  (`conceal.ts`), the same rule as a SQL predicate (`sql.ts`, for aggregates the
  map and totals compute in the database) and per-request resolution
  (`context.ts`). `tests/spoilers.test.ts` asserts the function and the SQL
  agree, because the map clusters in SQL and a disagreement would draw a cluster
  of seven that opens three.
- `db/migrations`: ordered, schema-only SQLite migrations.
- `db/seed.sql`: explicitly fictional, repeatable demonstration content.
- `tests`: policy, SQL and workflow verification.

Map filters are one object (`MapFilters` in `src/lib/map/viewport.ts`) shared by
the address bar, the request and the controller, so adding a filter is one field
rather than four signatures. The spoiler predicate and every filter are applied
in SQL because the map aggregates in SQL.

Shared entity identity supplies URLs, search, lifecycle, verification and SEO. Typed extension tables hold domain fields. Joins hold relationships. JSON is restricted to immutable revision snapshots and audit diffs; never the primary content store. Search uses SQLite FTS5 and bounded queries. Map coordinates are image-space X/Y on a fictional 1600 × 1000 map, not geographic coordinates.

Spoiler concealment happens in `src/lib/db/content.ts` rather than in each page,
so a surface added later inherits it. Listings mask a record and keep the row;
search drops it and reports the count. `EntityRow` is reached through
`ContentRow`, which is the single place that chooses between a normal row and a
masked one.

Browsing is anonymous. Guest progress persists in D1 using an opaque HttpOnly session cookie. Site-owned email/password accounts retain guest identity on registration and merge guest progress, favorites and map state when signing into an existing account. Roles are stored in D1 and checked on the server; the local owner bootstrap is an explicit database operation. Community submissions always enter moderation. Publication with verified status requires source evidence; DEMO records cannot be verified.

## Delivery phases

1. Schema, design tokens, shell and homepage.
2. Relational public entities and global search.
3. Image-coordinate map and collectibles.
4. Identity, durable progress and favorites.
5. Editorial CMS, moderation, source verification, import and revisions.
6. SEO, responsive/accessibility checks, security tests and deployment build.

Each checkpoint runs TypeScript and lint, with runtime/SQL checks appropriate to that phase. External credentials are supplied by the owner, never committed. Live deployment requires the owner's Cloudflare configuration and public submissions require Turnstile. No GitHub OAuth app is needed.
