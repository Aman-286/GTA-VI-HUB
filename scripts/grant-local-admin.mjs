// Explicit local-only bootstrap. Never invoked by registration or sign-in.
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
const email = process.argv[2]?.trim().toLowerCase();
if (!email)
  throw Error("Usage: node scripts/grant-local-admin.mjs your-account-email");
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = readdirSync(dir).filter(
  (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
);
if (files.length !== 1)
  throw Error(
    "Expected exactly one local D1 database. Apply local migrations first.",
  );
const d = new DatabaseSync(`${dir}/${files[0]}`);
try {
  const user = d
    .prepare(
      "SELECT u.id FROM users u JOIN credentials c ON c.user_id=u.id WHERE u.email=?",
    )
    .get(email);
  if (!user) throw Error("Create your website account locally first.");
  d.prepare("INSERT OR IGNORE INTO roles(user_id,role) VALUES(?,'admin')").run(
    user.id,
  );
  console.log("Administrator role granted to the specified local account.");
} finally {
  d.close();
}
