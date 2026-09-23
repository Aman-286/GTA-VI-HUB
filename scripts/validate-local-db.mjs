import { DatabaseSync, backup } from "node:sqlite";
import { readdirSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = readdirSync(dir).filter(
  (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
);
assert(files.length === 1, "Expected exactly one local application database");
const d = new DatabaseSync(`${dir}/${files[0]}`);
try {
  d.exec("PRAGMA busy_timeout=10000;");
  if (process.argv.includes("--backup")) {
    mkdirSync(".local", { recursive: true });
    const destination = `.local/audit-backup-${Date.now()}.sqlite`;
    await backup(d, destination);
    console.log(`Consistent local SQLite backup: ${destination}`);
  }
  assert.deepEqual(d.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(d.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  d.exec("INSERT INTO entity_search(entity_search) VALUES('integrity-check')");
  console.log("SQLite integrity, foreign keys and FTS integrity: PASS");
  console.log(
    JSON.stringify(
      {
        entities: d.prepare("SELECT COUNT(*) n FROM entities").get().n,
        markers: d.prepare("SELECT COUNT(*) n FROM map_markers").get().n,
        missingRevealTokens: d
          .prepare(
            "SELECT COUNT(*) n FROM entities WHERE reveal_token IS NULL OR reveal_token=''",
          )
          .get().n,
        migrations: d
          .prepare("SELECT name FROM d1_migrations ORDER BY id")
          .all(),
      },
      null,
      2,
    ),
  );
} finally {
  d.close();
}
