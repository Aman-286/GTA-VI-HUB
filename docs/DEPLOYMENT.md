# Deferred deployment — owner action next month

No website, account, database or storage bucket has been deployed or created remotely. Keep building locally. These instructions are for later and are not part of the current task's execution.

## Zero-cost operating envelope

Use Cloudflare **Workers Free**, D1 Free, optional GitHub Free for source hosting. Do not enable Workers Paid, R2, paid image transformation, paid email, hosted AI, or another metered service. Public assets are committed with the application. R2 uploads remain disabled because metered overages cannot be reconciled with a strict ₹0 bill guarantee.

Free tiers are quotas, not unlimited capacity. Verify the then-current Worker bundle size, CPU, request, D1 read/write and storage limits before launch. If the Next.js Worker exceeds a Free limit, reduce/break up the bundle or move public pages to static output rather than upgrading to a paid plan. A successful OpenNext build alone does not verify Free-plan runtime limits.

References checked during development:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://opennext.js.org/cloudflare/get-started

## When ready

1. Authenticate your own Cloudflare account using Wrangler. The current environment is not authenticated.
2. Create a D1 database named `gta-vi-hub`. Replace the local placeholder `database_id` in `wrangler.jsonc` with the actual ID. Keep binding `DB` and `migrations_dir` unchanged.
3. Set a trusted HTTPS origin in `SITE_URL` and build-time `NEXT_PUBLIC_SITE_URL`. Do not use request Host headers to construct canonicals.
4. Configure `TURNSTILE_SECRET_KEY` through Wrangler secrets and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` at build time. Accounts use local email/password credentials; no GitHub OAuth keys are needed. Grant the intended owner account an admin role through a trusted database operation after registration. Test native scrypt CPU usage on the target host before launch.
5. Apply migrations remotely. The initial migration is schema-only. Populate reviewed production content through a controlled import; only load `db/seed.sql` if you intentionally want DEMO records visible.
6. Run all tests, review contact/privacy pages and confirm source permissions. Complete the browser matrix in `VALIDATION.md`.
7. Build with `npm run build:worker`; inspect Wrangler's dry-run size output and test the artifact locally. OpenNext warns that Windows is not fully supported; a Linux/WSL build is preferable for release validation.
8. Only after the owner decides to publish, deploy the built Worker. Configure the purchased domain using Cloudflare DNS and a Worker custom domain.
9. Schedule `db/maintenance.sql` daily with a free scheduled workflow or a Worker cron handler. Keep database exports as backups before schema changes. Retention stated in the privacy page depends on running this maintenance.

No cache R2 bucket or paid image binding is required. DB-backed public pages render dynamically so newly published records appear without rebuilding. Use static assets and CDN caching where appropriate; do not cache personalized APIs.

## Optional analytics

The application has database-native aggregate search analytics. Cloudflare Web Analytics can be added later with the owner's free beacon token. No third-party analytics beacon is enabled in this local build.
