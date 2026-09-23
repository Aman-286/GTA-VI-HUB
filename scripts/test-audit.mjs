import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { randomUUID, randomBytes, createHash } from "node:crypto";

const base = process.env.HUB_BASE_URL || "http://localhost:3000";
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname),
  "Local test server required",
);
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const file = readdirSync(dir).find(
  (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
);
const d = new DatabaseSync(`${dir}/${file}`);
d.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;");
const prefix = `audit-${randomUUID()}`,
  userIds = [],
  entityIds = [],
  submissionIds = [],
  markerIds = [];
const hash = (s) => createHash("sha256").update(s).digest("hex");
let checks = 0;
function check(value, label) {
  assert(value, label);
  checks++;
  console.log(`PASS ${label}`);
}
async function req(
  path,
  { method = "GET", body, cookie = "", origin = base } = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
      "cf-connecting-ip": prefix,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const data = (r.headers.get("content-type") || "").includes("json")
    ? await r.json()
    : await r.text();
  return {
    r,
    data,
    cookie:
      r.headers
        .getSetCookie()
        .find((c) => c.startsWith("hub_session="))
        ?.split(";")[0] || "",
  };
}
function user(role, email = true) {
  const id = `${prefix}-${userIds.length}`,
    raw = randomBytes(32).toString("hex");
  userIds.push(id);
  d.prepare("INSERT INTO users(id,username,email) VALUES(?,?,?)").run(
    id,
    "Audit fixture",
    email ? `${id}@example.com` : null,
  );
  if (role) d.prepare("INSERT INTO roles VALUES(?,?)").run(id, role);
  d.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    hash(raw),
    id,
    Date.now() + 600000,
  );
  return { id, cookie: `hub_session=${raw}` };
}
function entity(spoiler = 0) {
  const id = `${prefix}-entity-${entityIds.length}`;
  entityIds.push(id);
  d.prepare(
    "INSERT INTO entities(id,game_id,kind,title,slug,description,body,is_demo,status,verification,spoiler_level,spoiler_category,reveal_token) VALUES(?,'gta6','missions',?,?,?, ?,0,'published','Verified',?,'story',?)",
  ).run(
    id,
    `Audit secret ${id}`,
    id,
    `Audit description ${id}`,
    `Audit body ${id} `.repeat(5),
    spoiler,
    randomBytes(16).toString("hex"),
  );
  d.prepare("INSERT INTO missions(entity_id,sequence) VALUES(?,50)").run(id);
  return id;
}
function sub(owner) {
  const id = `${prefix}-submission-${submissionIds.length}`;
  submissionIds.push(id);
  d.prepare(
    "INSERT INTO submissions(id,user_id,kind,title,description) VALUES(?,?,'missions','Audit submission','Local disposable audit submission')",
  ).run(id, owner);
  return id;
}
try {
  const admin = user("admin"),
    editor = user("editor"),
    contributor = user("contributor"),
    reader = user(),
    guest = user(null, false);
  let result = await req("/api/admin/users", { cookie: admin.cookie });
  check(
    result.r.status === 200,
    "email administrator can read account management",
  );
  for (const actor of [editor, contributor, reader, guest]) {
    result = await req("/api/admin/users", { cookie: actor.cookie });
    check(
      result.r.status === 403,
      `non-admin role ${actor.id.split("-").at(-1)} cannot read account management`,
    );
    result = await req("/api/admin/roles", {
      method: "POST",
      cookie: actor.cookie,
      body: { user_id: reader.id, role: "admin", enabled: true },
    });
    check(result.r.status === 403, "non-admin cannot grant a role");
  }
  result = await req("/api/admin/roles", {
    method: "POST",
    cookie: admin.cookie,
    body: { user_id: reader.id, role: "editor", enabled: true },
  });
  check(
    result.r.status === 200,
    "email administrator can grant an editor role",
  );
  result = await req("/api/admin/roles", {
    method: "POST",
    cookie: admin.cookie,
    body: { user_id: reader.id, role: "editor", enabled: false },
  });
  check(
    result.r.status === 200,
    "email administrator can revoke an editor role",
  );
  const secret = entity(2),
    visible = entity(0);
  const attack = '</script><script id="audit-injection">alert(1)</script>';
  d.prepare("UPDATE entities SET title=? WHERE id=?").run(attack, visible);
  result = await req(`/gta-6/missions/${visible}`);
  const jsonLd = result.data.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  check(
    result.r.status === 200 &&
      jsonLd &&
      !jsonLd[1].includes("<") &&
      JSON.parse(jsonLd[1]).itemListElement.at(-1).name === attack &&
      !result.data.includes(attack),
    "editorial title cannot break out of JSON-LD into executable HTML",
  );
  d.prepare("UPDATE entities SET category=? WHERE id=?").run(
    `Hidden category ${secret}`,
    secret,
  );
  const token = d
    .prepare("SELECT reveal_token FROM entities WHERE id=?")
    .get(secret).reveal_token;
  result = await req("/gta-6/missions", { cookie: guest.cookie });
  check(
    !result.data.includes(secret),
    "category dropdown does not disclose hidden category labels",
  );
  result = await req(`/gta-6/missions?q=${encodeURIComponent(secret)}`, {
    cookie: guest.cookie,
  });
  check(
    !result.data.includes(token),
    "filtered listings do not reveal that a hidden record matched",
  );
  const hiddenMarker = `${prefix}-hidden-marker`;
  d.prepare(
    "INSERT INTO map_markers(id,map_id,entity_id,category,x,y,unlock_requirements) VALUES(?,'demo-map',?,'community',123,456,?)",
  ).run(hiddenMarker, secret, `Secret requirement ${secret}`);
  result = await req(`/api/map?marker=${hiddenMarker}`, {
    cookie: guest.cookie,
  });
  check(
    result.data.marker.concealed &&
      result.data.marker.x === 0 &&
      result.data.marker.y === 0 &&
      !JSON.stringify(result.data).includes(secret),
    "deep-linked hidden marker conceals location and metadata",
  );
  result = await req(`/api/map?marker=${hiddenMarker}&reveal=${token}`, {
    cookie: guest.cookie,
  });
  check(
    result.data.marker.id === secret &&
      result.data.marker.x === 123 &&
      result.data.marker.unlock_requirements.includes(secret),
    "explicit marker reveal returns full location metadata",
  );
  result = await req("/api/map/summary", { cookie: guest.cookie });
  check(
    result.data.categories.find((c) => c.category === "community")?.total === 0,
    "category containing only concealed markers remains visible with a zero count",
  );
  for (const id of [secret, visible]) {
    d.prepare("INSERT INTO favorites(user_id,entity_id) VALUES(?,?)").run(
      guest.id,
      id,
    );
    d.prepare("INSERT INTO user_progress(user_id,entity_id) VALUES(?,?)").run(
      guest.id,
      id,
    );
    d.prepare("INSERT INTO recent_views(user_id,entity_id) VALUES(?,?)").run(
      guest.id,
      id,
    );
  }
  for (const path of [
    "/account",
    "/api/progress",
    "/api/preferences",
    "/",
    `/api/search?q=${encodeURIComponent(secret)}`,
  ]) {
    result = await req(path, { cookie: guest.cookie });
    check(
      result.r.status === 200 && !JSON.stringify(result.data).includes(secret),
      `${path.split("?")[0]} conceals hidden title, body and primary key`,
    );
  }
  result = await req("/api/progress", { cookie: guest.cookie });
  check(
    result.data.favorites.some((x) => x.entity_id === visible) &&
      result.data.recent.some((x) => x.id === visible),
    "visible saved/recent records remain usable",
  );
  result = await req("/api/progress", {
    cookie: `${guest.cookie}; hub_spoiler=all||`,
  });
  check(
    result.data.favorites.some((x) => x.entity_id === secret) &&
      result.data.recent.some((x) => x.id === secret),
    "re-enabling spoilers restores saved records without data loss",
  );
  result = await req("/api/preferences", {
    method: "PATCH",
    cookie: guest.cookie,
    body: { story_entity_id: token },
  });
  check(
    result.r.status === 200 &&
      result.data.spoiler.story_entity_id === token &&
      result.data.spoiler.story_sequence === 50,
    "story picker accepts opaque token and derives position server-side",
  );
  for (let i = 0; i < 3; i++)
    d.prepare(
      "INSERT INTO search_events(id,query,result_count) VALUES(?,?,1)",
    ).run(`${prefix}-search-${i}`, secret);
  result = await req("/", { cookie: guest.cookie });
  check(
    !result.data.includes(secret),
    "trending search text cannot bypass spoiler protection",
  );
  result = await req("/api/map?zoom=4", { cookie: "hub_spoiler=all||" });
  check(
    result.r.headers.get("cache-control") === "private, no-store",
    "all-visible map cannot enter a shared cache",
  );
  result = await req("/api/map?later=1&zoom=4");
  check(
    !result.data.markers.length && !result.data.clusters.length,
    "anonymous visit-later filter is empty",
  );
  result = await req("/api/account?user_id=" + guest.id, {
    cookie: reader.cookie,
  });
  check(
    result.data.user.id === reader.id && result.data.favorites.length === 0,
    "account endpoint ignores another user's ID",
  );
  result = await req("/api/account");
  check(result.r.status === 401, "private account data requires a session");
  result = await req("/api/progress", {
    method: "POST",
    cookie: reader.cookie,
    body: {
      entity_id: visible,
      type: "favorite",
      value: true,
      user_id: guest.id,
      roles: ["admin"],
    },
  });
  check(
    result.r.status === 200 &&
      d
        .prepare("SELECT 1 FROM favorites WHERE user_id=? AND entity_id=?")
        .get(reader.id, visible),
    "caller-supplied identity cannot redirect progress writes",
  );
  const submission = sub(reader.id);
  result = await req("/api/admin/submissions", {
    method: "POST",
    cookie: contributor.cookie,
    body: { id: submission, status: "approved", note: "Not permitted" },
  });
  check(result.r.status === 403, "contributor cannot approve own submissions");
  const decisions = await Promise.all(
    ["approved", "rejected"].map((status) =>
      req("/api/admin/submissions", {
        method: "POST",
        cookie: editor.cookie,
        body: { id: submission, status, note: "Audit review decision" },
      }),
    ),
  );
  check(
    decisions
      .map((x) => x.r.status)
      .sort()
      .join() === "200,409",
    "concurrent moderation has exactly one winner",
  );
  check(
    d
      .prepare(
        "SELECT COUNT(*) n FROM audit_logs WHERE target_id=? AND action LIKE 'submission.%'",
      )
      .get(submission).n === 1,
    "only the winning moderation decision is audited",
  );
  const status = d
    .prepare("SELECT status FROM submissions WHERE id=?")
    .get(submission).status;
  check(
    d
      .prepare("SELECT COUNT(*) n FROM reputation_events WHERE submission_id=?")
      .get(submission).n === (status === "approved" ? 1 : 0),
    "reputation matches the committed review decision",
  );
  const reject = sub(reader.id);
  result = await req("/api/admin/submissions", {
    method: "POST",
    cookie: editor.cookie,
    body: {
      id: reject,
      status: "rejected",
      note: "Insufficient source evidence",
    },
  });
  check(
    result.r.status === 200 &&
      d.prepare("SELECT status FROM submissions WHERE id=?").get(reject)
        .status === "rejected",
    "moderator rejection persists",
  );
  const importedSlug = `${prefix}-import`;
  result = await req("/api/admin/import", {
    method: "POST",
    cookie: admin.cookie,
    body: {
      confirm: true,
      csv: `kind,title,slug,description,body,is_demo\nmissions,Audit imported mission,${importedSlug},This record is an audit fixture,An audit body used only for regression checks,1`,
    },
  });
  const imported = d
    .prepare("SELECT * FROM entities WHERE slug=?")
    .get(importedSlug);
  if (imported) entityIds.push(imported.id);
  check(
    result.r.status === 200 &&
      imported?.reveal_token?.length === 32 &&
      imported.status === "draft",
    "CSV imports receive opaque reveal tokens and remain drafts",
  );
  // Real registration and login exercise the guest merge; role fixtures above never use credentials.
  const email = `${prefix}@example.com`,
    password = "Audit-only sufficiently long password 42";
  result = await req("/api/auth/local", {
    method: "POST",
    body: { action: "register", email, password, username: "Audit account" },
  });
  check(result.r.status === 200, "test account registers through public API");
  const account = d.prepare("SELECT id FROM users WHERE email=?").get(email);
  userIds.push(account.id);
  const accountCookie = result.cookie;
  await req("/api/preferences", {
    method: "PATCH",
    cookie: accountCookie,
    body: { mode: "none", reveal_category: "story", reveal_value: false },
  });
  const marker = d.prepare("SELECT id FROM map_markers LIMIT 1").get().id;
  d.prepare(
    "INSERT INTO user_marker_state(user_id,marker_id,discovered,visit_later) VALUES(?,?,1,0),(?,?,0,1)",
  ).run(account.id, marker, guest.id, marker);
  result = await req("/api/auth/local", {
    method: "POST",
    cookie: `${guest.cookie}; hub_spoiler=all||story`,
    body: { action: "login", email, password },
  });
  check(result.r.status === 200, "guest signs into existing account");
  const state = d
    .prepare("SELECT * FROM user_marker_state WHERE user_id=? AND marker_id=?")
    .get(account.id, marker);
  check(
    state.discovered === 1 && state.visit_later === 1,
    "guest map flags merge without overwriting existing account flags",
  );
  check(
    d
      .prepare("SELECT spoiler_mode FROM user_preferences WHERE user_id=?")
      .get(account.id).spoiler_mode === "none" &&
      !d
        .prepare(
          "SELECT 1 FROM user_revealed_categories WHERE user_id=? AND category='story'",
        )
        .get(account.id),
    "login preserves existing account spoiler mode and category opt-outs",
  );
  result = await req("/api/progress", { cookie: result.cookie });
  check(
    result.data.favorites.some((x) => x.entity_id === visible),
    "guest favorites survive existing-account login and readback",
  );
  // Large dataset uses disposable markers linked only to this run's visible record.
  const insert = d.prepare(
    "INSERT INTO map_markers(id,map_id,entity_id,category,x,y) VALUES(?,'demo-map',?,'missions',?,?)",
  );
  d.exec("BEGIN");
  for (let i = 0; i < 10000; i++) {
    const id = `${prefix}-marker-${i}`;
    markerIds.push(id);
    insert.run(id, visible, (i * 37) % 1600, (i * 61) % 1000);
  }
  d.exec("COMMIT");
  for (const zoom of [-2, 0, 5]) {
    const start = performance.now();
    result = await req(`/api/map?category=missions&zoom=${zoom}`);
    check(
      result.r.status === 200 &&
        result.data.markers.length <= 90 &&
        result.data.clusters.length <= 250,
      `10,000-marker query at zoom ${zoom} stays bounded (${Math.round(performance.now() - start)} ms including HTTP)`,
    );
  }
  check(
    d.prepare("PRAGMA foreign_key_check").all().length === 0,
    "foreign-key integrity after audited workflows",
  );
  console.log(`${checks} audit regression checks passed.`);
} finally {
  if (d.isTransaction) d.exec("ROLLBACK");
  d.exec("BEGIN");
  for (const id of submissionIds) {
    d.prepare("DELETE FROM reputation_events WHERE submission_id=?").run(id);
    d.prepare("DELETE FROM submission_evidence WHERE submission_id=?").run(id);
    d.prepare("DELETE FROM submissions WHERE id=?").run(id);
  }
  for (const id of userIds)
    d.prepare("DELETE FROM audit_logs WHERE user_id=?").run(id);
  d.prepare("DELETE FROM search_events WHERE id LIKE ?").run(`${prefix}%`);
  for (const id of entityIds)
    d.prepare("DELETE FROM entities WHERE id=?").run(id);
  for (const id of userIds) d.prepare("DELETE FROM users WHERE id=?").run(id);
  d.exec("COMMIT");
  d.close();
}
