# Validation record

The latest independent results and feature classifications are in [the 16 September audit](INDEPENDENT-AUDIT-2026-09-16.md): 63 unit tests, 137 HTTP checks against the built local Worker, 39 linked pages, seven image URLs, database preservation and both production builds. Browser interaction remains independently unverified because no browser was connected. Entries below describe earlier development passes, not additional evidence for this review.

Environment: Windows, Node 24, Next.js 16.3.3, local Cloudflare D1 emulation. Deployment explicitly deferred by the owner.

## Completed checks

- Standalone account replacement: 23 unit tests and 60 local HTTP checks passed (40 existing application flows plus 20 registration/login/password/recovery checks). TypeScript and ESLint passed. Account tests cover guest retention, normalized email, incorrect passwords, duplicate registration, recovery-code rotation/replay, session revocation, CSRF, rate limits, secret exclusion, and role isolation. The editorial fixture now uses an email account instead of GitHub identity.

- September 8 map and visual refresh: Next production build, TypeScript, and ESLint passed. 21 unit tests passed (11 new map-controller/viewport regression checks), along with all 40 existing local HTTP integration checks. Additional HTTP checks confirmed official WebP assets, homepage/banner references, and stable cluster IDs. The final favicon palette change was inspected as SVG source.
- Map tests cover instance retention across movement, selection without zoom/refetch, response races, rapid-event coalescing, canvas resize, reduced-motion focus, network retry, unmount cleanup, viewport coordinate conversion, and mobile fit zoom. They use a mocked Leaflet adapter; real touch, wheel, and visual rendering remain unverified.

- TypeScript compilation and ESLint during foundation, public/search/map, identity and CMS implementation.
- Initial schema: 56 schema statements applied successfully; 91 seed statements applied; repeated seed execution verified in tests.
- Ten automated tests: verification policy, safe URLs, repeatable seed and foreign keys, FTS updates, map bounds, indexed listings, user isolation, quoted CSV fields, draft defaults and duplicates.
- Forty local HTTP integration checks: representative page routes, sitemap rules, search, marker category/viewport filtering, guest creation, progress/favorite persistence, unknown IDs, origin enforcement, guest/editor boundaries, verification rejection, publishing, revision increments, stale edits, rollback visibility, duplicate imports, moderation and OAuth state rejection.
- Next.js optimized production build and OpenNext Cloudflare artifact build succeeded before final usability changes. Final verification status is recorded in the session response.

## Important test detail

Next.js can send HTTP 200 when a not-found boundary is reached after streaming begins. The draft visibility test verifies that only the not-found page appears and no draft title/body is exposed; it accepts either a non-streamed 404 or a streamed not-found response. The framework adds noindex in this state.

## Still unverified

- Visual and interaction checks at **390 / 768 / 1024 / 1440 / 1920 px**. No browser was connected. Check horizontal overflow, mobile bottom navigation, map sheet behavior, search focus trapping, arrow/Enter/Escape navigation, 200% text scaling, contrast and touch controls manually.
- Real-browser account form/autofill checks and Turnstile challenge verification. GitHub sign-in is retired. Email delivery and verification are not configured; recovery uses a private saved code.
- Production Worker behavior, bundle-size acceptance, CPU and D1 usage under the Free plan. Nothing is deployed.
- Optional WebMCP tools in a supported browser context.

## Manual acceptance flows

1. Open `/`, use Ctrl/Cmd+K, search `helicopter`, navigate results by keyboard, press Escape and confirm focus returns.
2. Open the map. Filter collectibles, choose a marker, complete it, enable Missing only and verify it disappears. Reopen its URL and check selection. Try the text directory without using the canvas.
3. Refresh the account and collectible pages; confirm completion and favorites survive. Try a separate browser profile to confirm isolation.
4. Register a local email/password test account and grant that disposable account an editor role through a trusted local database operation. Sign in, create an unverified draft, attach source evidence, publish, edit and roll back. Confirm a second editor with a stale revision is rejected. GitHub OAuth is retired.
5. Submit a discovery, review its evidence and approve it. Confirm no public content is created automatically. Import the template, confirm duplicates are rejected on repeat, and verify all imported records remain drafts.
