# Security boundaries

- All editor APIs call `requireEditor`; role management additionally calls `requireAdmin`. Client controls are not authorization boundaries. Local role bootstrap is an explicit owner-run database command. Registration never grants roles.
- Site-owned accounts use normalized email identifiers and scrypt password hashes (N=16384, r=8, p=5, random 16-byte salts). Credential hashes live in a separate table and never enter session/profile responses. Recovery uses a random 256-bit code, stored only as a SHA-256 hash and rotated on use. Email is not verified and no mail is sent. Sessions are random, hashed in D1, HttpOnly, SameSite=Lax and Secure on HTTPS; sign-in rotates the cookie. Password changes and recovery invalidate all sessions. IP and account fixed-window limits precede hashing.
- Guest progress is isolated by the opaque session's database user ID. The caller cannot supply another user ID for progress, favorites or profile changes.
- Mutations require the exact configured Origin. Routes validate input with Zod, bound payload sizes and use prepared values. SQL identifiers come only from server-owned allowlists. D1-backed fixed-window rate limits protect session creation, search, editorial actions and submissions.
- Plain text content is rendered as React text; raw user HTML and unsafe Markdown are not rendered. Source links reject executable schemes and embedded credentials. JSON-LD escapes `<`.
- Submissions always enter moderation. Approval records a decision and reputation event without publishing. Public submissions require hostname/action-validated Turnstile, with a localhost-only development exemption.
- Demo verification is constrained in both the schema and server policy. Verified publication requires attached source evidence; Official requires an Official source. This validates evidence presence, not evidence truth: humans must review it.
- Revision numbers detect stale saves. Entity update, domain fields, objectives, revision and audit record share an atomic D1 batch. Rollback creates a new draft for review. CSV imports validate and preview, reject duplicate slugs and insert drafts atomically.
- File uploads are disabled; map images must refer to committed local assets. No permissive file endpoint or object storage cost exposure exists.
- Header protections include nosniff, frame denial, a referrer policy and disabled camera/microphone/geolocation. A strict production CSP with framework nonces is not yet implemented; do not claim a complete external security audit.

Before public launch, exercise account recovery, concurrent credential changes and guest account merging, Turnstile expiry/replay, concurrent moderation decisions, load limits, abuse retention and browser focus behavior. Unit/integration tests cover key application boundaries, not every deployment or provider failure mode.

Password parameters: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
Cloudflare crypto compatibility: https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/
