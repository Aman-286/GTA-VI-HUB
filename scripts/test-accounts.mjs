import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  file = readdirSync(dir).find(
    (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
  );
const d = new DatabaseSync(`${dir}/${file}`);
d.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;");
const base = process.env.HUB_BASE_URL || "http://localhost:3000",
  email = `test-${randomUUID()}@example.com`,
  password = "My original tropical password 42",
  next = "My replacement tropical password 43",
  users = [];
let checks = 0;
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname),
  "Account fixtures must only target a local server.",
);
const hash = (s) => createHash("sha256").update(s).digest("hex");
function clearAccountLimit() {
  d.prepare("DELETE FROM rate_limits WHERE key=?").run(
    hash(`credentials-account:${email}:${Math.floor(Date.now() / 60000)}`),
  );
}
async function request(path, body, cookie = "", origin = base) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "cf-connecting-ip": randomUUID(),
      Cookie: cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie:
      r.headers
        .getSetCookie()
        .find((c) => c.startsWith("hub_session="))
        ?.split(";")[0] || "",
  };
}
async function auth(action, extra = {}, cookie = "") {
  clearAccountLimit();
  return request(
    "/api/auth/local",
    { action, email, password, ...extra },
    cookie,
  );
}
function check(value, label) {
  assert(value, label);
  checks++;
  console.log("PASS " + label);
}
try {
  let r = await request("/api/session", {});
  const guest = r.cookie;
  users.push(r.data.user.id);
  const entity = d
    .prepare("SELECT id FROM entities WHERE status='published' LIMIT 1")
    .get().id;
  d.prepare("INSERT INTO favorites(user_id,entity_id) VALUES(?,?)").run(
    users[0],
    entity,
  );
  r = await request(
    "/api/auth/local",
    { action: "register", email, password, username: "Explorer" },
    guest,
    "https://other.example",
  );
  check(r.status === 403, "cross-origin registration denied");
  r = await auth(
    "register",
    { username: "Explorer", password: "short" },
    guest,
  );
  check(r.status === 400, "short passwords rejected");
  r = await auth("register", { username: "Explorer" }, guest);
  check(
    r.status === 200 && r.data.recovery?.length === 64,
    "standalone registration returns a private recovery code",
  );
  const recovery = r.data.recovery,
    session = r.cookie;
  r = await request("/api/session", undefined, session);
  check(
    r.data.user.email === email && r.data.user.github_id === null,
    "account needs no GitHub identity",
  );
  check(
    r.data.user.id === users[0],
    "registration preserves the guest identity",
  );
  check(
    !JSON.stringify(r.data).includes("password_hash"),
    "session response never exposes credential hashes",
  );
  r = await request("/api/account", undefined, session);
  check(
    r.data.favorites.some((f) => f.entity_id === entity),
    "guest favorites survive registration",
  );
  r = await request("/api/session", undefined, guest);
  check(
    r.data.user === null,
    "registration invalidates the previous guest session",
  );
  r = await auth("register", { username: "Duplicate" });
  check(r.status === 409, "duplicate email cannot create another account");
  r = await auth("login", { password: "incorrect" });
  check(r.status === 401, "incorrect password denied");
  r = await auth("login", { email: email.toUpperCase() });
  check(r.status === 200, "email sign-in is case insensitive");
  const second = r.cookie;
  r = await request("/api/admin/entities", undefined, second);
  check(r.status === 403, "new accounts cannot access editorial APIs");
  r = await auth("recover", { recovery: "wrong", password: next });
  check(r.status === 401, "incorrect recovery code denied");
  r = await auth("recover", { recovery, password: next });
  check(
    r.status === 200 && r.data.recovery !== recovery,
    "recovery resets password and rotates code",
  );
  const recovered = r.cookie;
  r = await request("/api/session", undefined, second);
  check(r.data.user === null, "recovery revokes other-device sessions");
  r = await auth("recover", { recovery, password: next });
  check(r.status === 401, "consumed recovery code cannot be reused");
  r = await auth("login");
  check(r.status === 401, "old password no longer works");
  r = await auth("login", { password: next });
  check(r.status === 200, "new password signs in");
  r = await auth("password", { password, current_password: next }, recovered);
  check(r.status === 200, "signed-in users can change their password");
  const latestRecovery = r.data.recovery;
  clearAccountLimit();
  const recoveryRace = await Promise.all(
    [0, 1].map(() =>
      request("/api/auth/local", {
        action: "recover",
        email,
        password: next,
        recovery: latestRecovery,
      }),
    ),
  );
  check(
    recoveryRace.filter((result) => result.status === 200).length === 1 &&
      recoveryRace.filter((result) => [401, 409].includes(result.status))
        .length === 1,
    "concurrent recovery consumes the code exactly once",
  );
  const activeSessions = d
    .prepare("SELECT COUNT(*) n FROM sessions WHERE user_id=?")
    .get(users[0]);
  check(
    activeSessions.n === 1,
    "credential rotation leaves only the winning recovery session",
  );
  // Nine attempts must occur in one fixed window. Starting just before the
  // minute rolls over otherwise tests two legitimate buckets and flakes.
  const remainingWindow = 60000 - (Date.now() % 60000);
  if (remainingWindow < 15000)
    await new Promise((resolve) => setTimeout(resolve, remainingWindow + 100));
  clearAccountLimit();
  for (let i = 0; i < 9; i++)
    r = await request("/api/auth/local", {
      action: "login",
      email,
      password: "bad",
    });
  check(r.status === 429, "repeated attempts are rate limited across IPs");
  console.log(`${checks} account integration checks passed.`);
} finally {
  clearAccountLimit();
  for (const id of users) d.prepare("DELETE FROM users WHERE id=?").run(id);
  d.close();
}
