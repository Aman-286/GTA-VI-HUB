import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { randomBytes, createHash, randomUUID } from "node:crypto";
const base = process.env.HUB_BASE_URL || "http://localhost:3000";
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname),
  "Integration fixtures must only target a local server.",
);
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const path = readdirSync(dir).find(
  (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
);
assert(
  path,
  "Run migrations and start the local app before integration tests.",
);
const d = new DatabaseSync(`${dir}/${path}`);
d.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;");
const ids = [],
  sourceIds = [],
  subIds = [],
  tokens = [],
  userIds = [];
let checks = 0;
async function request(path, method = "GET", body, cookie, origin = base) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(method !== "GET"
        ? { "Content-Type": "application/json", Origin: origin }
        : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const type = r.headers.get("content-type") || "";
  return { r, data: type.includes("json") ? await r.json() : await r.text() };
}
function check(condition, message) {
  assert(condition, message);
  checks++;
  console.log(`PASS ${message}`);
}
function adminFixture() {
  const raw = randomBytes(32).toString("hex"),
    id = randomUUID();
  userIds.push(id);
  const hash = createHash("sha256").update(raw).digest("hex");
  tokens.push(hash);
  d.prepare("INSERT INTO users(id,username,email) VALUES(?,?,?)").run(
    id,
    "Local integration editor",
    `test-${id}@example.com`,
  );
  d.prepare("INSERT INTO roles VALUES(?,'admin')").run(id);
  d.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    hash,
    id,
    Date.now() + 600000,
  );
  return `hub_session=${raw}`;
}
try {
  for (const path of [
    "/",
    "/gta-6/map",
    "/gta-6/missions",
    "/gta-6/vehicles",
    "/gta-6/weapons",
    "/gta-6/cheats",
    "/gta-6/collectibles",
    "/gta-6/missions/coastal-delivery",
    "/account",
    "/admin",
    "/submit",
    "/privacy",
    "/sitemap.xml",
  ]) {
    const { r } = await request(path);
    check(r.status === 200, `route ${path} returns 200`);
  }
  const sitemap = await request("/sitemap.xml");
  check(
    !sitemap.data.includes("coastal-delivery") &&
      sitemap.data.includes("using-the-map"),
    "sitemap includes useful guides and excludes demo entities",
  );
  let result = await request("/api/search?q=helicopter");
  check(
    result.data.items.some((e) => e.slug === "coastal-helicopter"),
    "FTS returns the demo helicopter",
  );
  result = await request("/api/map?category=collectibles&zoom=4");
  check(
    result.data.markers.length === 8 &&
      result.data.markers.every((m) => m.kind === "collectibles"),
    "map category filter uses bounded image coordinates",
  );
  result = await request("/api/map?x1=0&x2=100&y1=0&y2=100");
  check(
    result.data.markers.length === 0,
    "map viewport excludes out-of-view markers",
  );
  result = await request("/api/admin/entities");
  check(result.r.status === 401, "anonymous admin API access denied");
  result = await request(
    "/api/session",
    "POST",
    {},
    undefined,
    "https://untrusted.example",
  );
  check(result.r.status === 403, "cross-origin session creation denied");
  const guest = await request("/api/session", "POST", {});
  const cookie = guest.r.headers.get("set-cookie")?.split(";")[0];
  check(guest.r.status === 200 && !!cookie, "guest session created");
  userIds.push(guest.data.user.id);
  result = await request("/api/admin/entities", "POST", {}, cookie);
  check(result.r.status === 403, "guest cannot write editorial content");
  result = await request(
    "/api/progress",
    "POST",
    { entity_id: "demo-sample-token-1", type: "progress", value: true },
    cookie,
  );
  check(result.r.status === 200, "guest completion saved");
  result = await request(
    "/api/progress",
    "POST",
    { entity_id: "demo-touring-coupe", type: "favorite", value: true },
    cookie,
  );
  check(result.r.status === 200, "guest favorite saved");
  result = await request("/api/progress", "GET", undefined, cookie);
  check(
    result.data.progress.some((p) => p.entity_id === "demo-sample-token-1") &&
      result.data.favorites.some((p) => p.entity_id === "demo-touring-coupe"),
    "progress and favorites persist on readback",
  );
  result = await request(
    "/api/progress",
    "POST",
    { entity_id: "missing", type: "progress", value: true },
    cookie,
  );
  check(result.r.status === 404, "unknown entities cannot enter progress");
  result = await request(
    "/api/submissions",
    "POST",
    {
      kind: "locations",
      title: "Integration test discovery",
      description:
        "An explicitly fictional local integration test with a public evidence reference.",
      url: "https://example.com/evidence",
    },
    cookie,
  );
  check(
    result.r.status === 200 && result.data.status === "pending",
    "community submission enters moderation",
  );
  subIds.push(result.data.id);
  const admin = adminFixture();
  result = await request("/api/admin/entities", "GET", undefined, admin);
  check(result.r.status === 200, "authorized editor can read CMS");
  const slug = `test-${randomUUID()}`,
    record = {
      kind: "vehicles",
      slug,
      title: "Integration test coupe",
      description:
        "A fictional vehicle record used solely for integration testing.",
      body: "This is an explicitly fictional test record used to validate publication, revisions and source checks. It does not represent actual game content.",
      category: "Test",
      is_demo: 1,
      verification: "Verified",
      status: "published",
      details: { seats: 2, speed: 0 },
    };
  result = await request("/api/admin/entities", "POST", record, admin);
  check(result.r.status === 400, "editor cannot verify a demo");
  result = await request(
    "/api/admin/entities",
    "POST",
    { ...record, is_demo: 0 },
    admin,
  );
  check(
    result.r.status === 400,
    "editor cannot verify an unsourced real record",
  );
  result = await request(
    "/api/admin/entities",
    "POST",
    { ...record, verification: "Unverified" },
    admin,
  );
  check(result.r.status === 200, "editor can publish a clearly labeled demo");
  const entityId = result.data.id;
  ids.push(entityId);
  result = await request(`/gta-6/vehicles/${slug}`);
  check(
    result.r.status === 200 && result.data.includes("Integration test coupe"),
    "published CMS record renders without a rebuild",
  );
  result = await request(
    "/api/admin/entities",
    "POST",
    {
      ...record,
      id: entityId,
      revision: 1,
      verification: "Unverified",
      title: "Updated integration coupe",
    },
    admin,
  );
  check(
    result.r.status === 200 && result.data.revision === 2,
    "edit creates next revision",
  );
  result = await request(
    "/api/admin/entities",
    "POST",
    { ...record, id: entityId, revision: 1, verification: "Unverified" },
    admin,
  );
  check(
    result.r.status === 409,
    "stale revision cannot overwrite newer content",
  );
  result = await request(
    "/api/admin/rollback",
    "POST",
    { id: entityId, revision: 1, current_revision: 2 },
    admin,
  );
  check(
    result.r.status === 200 && result.data.revision === 3,
    "rollback creates a new draft revision",
  );
  result = await request(`/gta-6/vehicles/${slug}`);
  check(
    (result.r.status === 404 || result.data.includes("Off the beaten path.")) &&
      !result.data.includes("Integration test coupe") &&
      !result.data.includes("Updated integration coupe"),
    "rolled-back draft is not publicly visible (including streamed not-found)",
  );
  result = await request(
    "/api/admin/import",
    "POST",
    {
      csv:
        "kind,title,slug,description\nvehicles,Duplicate test," +
        slug +
        ",An explicitly fictional duplicate test record",
      confirm: true,
    },
    admin,
  );
  check(
    result.data.imported === 0 && result.data.errors.length > 0,
    "CSV import refuses existing slugs",
  );
  result = await request(
    "/api/admin/submissions",
    "POST",
    {
      id: subIds[0],
      status: "approved",
      note: "Test evidence reviewed; no public record created.",
    },
    admin,
  );
  check(result.r.status === 200, "moderator can approve a contribution");
  check(
    d
      .prepare("SELECT COUNT(*) n FROM entities WHERE title=?")
      .get("Integration test discovery").n === 0,
    "submission approval never auto-publishes",
  );
  // --- Spoiler safety -------------------------------------------------------
  //
  // Exercised over HTTP against the running app, not against the policy
  // function, because the guarantee that matters is what actually leaves the
  // server: a masked record must not carry its title, slug or primary key in
  // any response the default setting produces.
  const spoilerId = randomUUID();
  ids.push(spoilerId);
  d.prepare(
    "INSERT INTO entities(id,game_id,kind,slug,title,description,body,category,is_demo,status,spoiler_level,spoiler_category,reveal_after_sequence,safe_title,safe_description,reveal_token) VALUES(?,'gta6','secrets',?,?,?,?,'Integration',1,'published',2,'story',4,?,?,lower(hex(randomblob(16))))",
  ).run(
    spoilerId,
    "integration-spoiler-record",
    "Integration spoiler headline",
    "A fixture description that must never appear while concealed.",
    "x".repeat(120),
    "Integration safe title",
    "Integration safe description",
  );
  const revealToken = d
    .prepare("SELECT reveal_token FROM entities WHERE id=?")
    .get(spoilerId).reveal_token;
  check(
    typeof revealToken === "string" && /^[0-9a-f]{32}$/.test(revealToken),
    "a spoiler fixture carries an opaque reveal token",
  );
  check(
    /^[0-9a-f]{32}$/.test(
      d
        .prepare(
          "SELECT reveal_token FROM entities WHERE kind='vehicles' AND slug=?",
        )
        .get(slug)?.reveal_token || "",
    ),
    "a record created through the CMS is given an opaque reveal token",
  );

  const guestSpoiler = await request("/api/session", "POST");
  userIds.push(guestSpoiler.data.user.id);
  const spoilerCookie = (guestSpoiler.r.headers.getSetCookie?.() || [])
    .map((c) => c.split(";")[0])
    .join("; ");

  result = await request("/gta-6/secrets", "GET", undefined, spoilerCookie);
  check(
    !result.data.includes("Integration spoiler headline") &&
      !result.data.includes("integration-spoiler-record") &&
      !result.data.includes(spoilerId),
    "a concealed record leaks no title, slug or id into a listing",
  );
  check(
    result.data.includes("Integration safe title"),
    "a concealed record shows the editor's safe stand-in instead",
  );

  result = await request(
    "/gta-6/secrets/integration-spoiler-record",
    "GET",
    undefined,
    spoilerCookie,
  );
  check(
    result.r.status === 200 &&
      !result.data.includes("Integration spoiler headline"),
    "opening a concealed record directly shows a gate, not the record",
  );

  result = await request(
    "/api/search?q=Integration+spoiler+headline",
    "GET",
    undefined,
    spoilerCookie,
  );
  check(
    !result.data.items.some((i) => i.id === spoilerId) &&
      result.data.hidden >= 1,
    "search withholds a concealed record and reports that it did",
  );

  result = await request(
    `/api/reveal?ids=${spoilerId}`,
    "GET",
    undefined,
    spoilerCookie,
  );
  check(
    result.data.items.length === 0,
    "the reveal endpoint refuses a primary key, accepting only the token",
  );
  result = await request(
    `/api/reveal?ids=${revealToken}`,
    "GET",
    undefined,
    spoilerCookie,
  );
  check(
    result.data.items[0]?.title === "Integration spoiler headline",
    "the reveal endpoint returns the record when asked by its token",
  );

  // Story progress must lift concealment without changing the mode.
  result = await request(
    "/api/preferences",
    "PATCH",
    { mode: "none" },
    spoilerCookie,
  );
  check(result.r.status === 200, "spoiler preference accepted for a guest");
  const guestPrefCookie = (result.r.headers.getSetCookie?.() || [])
    .map((c) => c.split(";")[0])
    .join("; ");
  result = await request(
    "/gta-6/secrets",
    "GET",
    undefined,
    `${spoilerCookie}; ${guestPrefCookie}`,
  );
  check(
    !result.data.includes("Integration spoiler headline"),
    "no-spoilers mode still conceals after an explicit save",
  );
  result = await request(
    "/gta-6/secrets",
    "GET",
    undefined,
    `${spoilerCookie}; hub_spoiler=none%7C9%7C`,
  );
  check(
    result.data.includes("Integration spoiler headline"),
    "a reader past the story threshold sees the record without changing mode",
  );
  result = await request(
    "/gta-6/secrets",
    "GET",
    undefined,
    `${spoilerCookie}; hub_spoiler=none%7C%7Cstory`,
  );
  check(
    result.data.includes("Integration spoiler headline"),
    "an always-show category lifts concealment for that category",
  );
  result = await request(
    "/gta-6/secrets",
    "GET",
    undefined,
    `${spoilerCookie}; hub_spoiler=none%7C%7Cending`,
  );
  check(
    !result.data.includes("Integration spoiler headline"),
    "an always-show category does not lift the others",
  );
  result = await request(
    "/api/preferences",
    "PATCH",
    { mode: "all" },
    spoilerCookie,
    "https://attacker.example",
  );
  check(
    result.r.status === 403,
    "a cross-origin spoiler preference write is refused",
  );

  result = await request(
    "/api/map",
    "GET",
    undefined,
    `${spoilerCookie}; hub_spoiler=none%7C%7C`,
  );
  check(
    !JSON.stringify(result.data.markers).includes("After hours"),
    "the map withholds markers for concealed records",
  );

  // --- Map markers -----------------------------------------------------------
  //
  // The filters are checked over HTTP because their correctness lives in SQL,
  // not in the component: a filter that narrows the pin list but not the
  // cluster counts draws a cluster of seven that opens three.
  const guestMap = await request("/api/session", "POST");
  userIds.push(guestMap.data.user.id);
  const mapCookie = (guestMap.r.headers.getSetCookie?.() || [])
    .map((c) => c.split(";")[0])
    .join("; ");

  result = await request("/api/map", "GET", undefined, mapCookie);
  const allMarkers = result.data.markers.length;
  check(allMarkers > 0, "the map returns markers for the demonstration map");

  result = await request(
    "/api/map?category=collectibles",
    "GET",
    undefined,
    mapCookie,
  );
  check(
    result.data.markers.length > 0 &&
      result.data.markers.every((m) => m.marker_category === "collectibles"),
    "a category filter returns only that category",
  );
  const collectibles = result.data.markers.length;

  result = await request(
    "/api/map?category=collectibles&sub=collectibles-set",
    "GET",
    undefined,
    mapCookie,
  );
  check(
    result.data.markers.length > 0 &&
      result.data.markers.length <= collectibles,
    "a subcategory filter narrows within its category",
  );

  result = await request(
    "/api/map?category=collectibles&sub=missions-story",
    "GET",
    undefined,
    mapCookie,
  );
  check(
    result.data.markers.length === 0,
    "a subcategory from another category matches nothing rather than being ignored",
  );

  result = await request(
    "/api/map?region=demo-coast",
    "GET",
    undefined,
    mapCookie,
  );
  const inRegion = result.data.markers.length;
  result = await request(
    "/api/map?region=no-such-region",
    "GET",
    undefined,
    mapCookie,
  );
  check(
    inRegion > 0 && result.data.markers.length === 0,
    "a region filter is applied rather than ignored",
  );

  const nearId = (
    await request("/api/map?category=collectibles", "GET", undefined, mapCookie)
  ).data.markers[0].marker_id;
  result = await request(
    `/api/map?near=${nearId}&radius=40`,
    "GET",
    undefined,
    mapCookie,
  );
  const tight = result.data.markers.length;
  result = await request(
    `/api/map?near=${nearId}&radius=2000`,
    "GET",
    undefined,
    mapCookie,
  );
  check(
    tight >= 1 && tight < result.data.markers.length,
    "a nearby radius actually restricts the result",
  );

  // Marker state: write, read back, and confirm it is the reader's own.
  result = await request(
    "/api/map/state",
    "POST",
    { marker_id: nearId, visit_later: true },
    mapCookie,
  );
  check(
    result.r.status === 200 && result.data.visit_later === true,
    "a marker can be saved to visit later",
  );
  result = await request(
    "/api/map/state",
    "POST",
    { marker_id: nearId, discovered: true },
    mapCookie,
  );
  check(
    result.data.discovered === true && result.data.visit_later === true,
    "setting one marker flag leaves the other alone",
  );
  result = await request("/api/map?later=1", "GET", undefined, mapCookie);
  check(
    result.data.markers.length === 1 &&
      result.data.markers[0].marker_id === nearId,
    "the visit-later filter returns only the reader's saved markers",
  );
  result = await request("/api/map?later=1");
  check(
    result.data.markers.length === 0 && result.data.clusters.length === 0,
    "an anonymous reader has no saved markers or clusters",
  );
  result = await request(
    "/api/map/state",
    "POST",
    { marker_id: "no-such-marker", visit_later: true },
    mapCookie,
  );
  check(
    result.r.status === 404,
    "marker state cannot be written for an id that does not exist",
  );
  result = await request(
    "/api/map/state",
    "POST",
    { marker_id: nearId, visit_later: true },
    mapCookie,
    "https://attacker.example",
  );
  check(result.r.status === 403, "a cross-origin marker write is refused");
  result = await request("/api/map/state", "POST", {
    marker_id: nearId,
    visit_later: true,
  });
  check(
    result.r.status === 401,
    "marker state requires a session rather than defaulting to someone",
  );

  result = await request("/api/map/summary", "GET", undefined, mapCookie);
  const summed = result.data.categories.reduce((n, c) => n + c.total, 0);
  check(
    result.data.overall.total === summed &&
      result.data.overall.saved === 1 &&
      result.data.categories.every((c) => c.completed <= c.total),
    "the summary totals are counted from the database and add up",
  );

  result = await request("/api/auth/callback?state=invalid&code=invalid");
  check(
    result.r.status === 303 &&
      result.r.headers.get("location").endsWith("/account"),
    "retired OAuth callback returns to local account sign-in",
  );
  check(
    d.prepare("PRAGMA foreign_key_check").all().length === 0,
    "no foreign-key violations after workflows",
  );
  console.log(`\n${checks} integration checks passed.`);
} finally {
  // Delete only fixture rows created by this script in the explicitly local database.
  for (const id of subIds) {
    d.prepare("DELETE FROM reputation_events WHERE submission_id=?").run(id);
    d.prepare("DELETE FROM submission_evidence WHERE submission_id=?").run(id);
    d.prepare("DELETE FROM submissions WHERE id=?").run(id);
  }
  for (const id of ids) d.prepare("DELETE FROM entities WHERE id=?").run(id);
  for (const id of sourceIds)
    d.prepare("DELETE FROM sources WHERE id=?").run(id);
  for (const id of userIds) {
    d.prepare("DELETE FROM audit_logs WHERE user_id=?").run(id);
    d.prepare("DELETE FROM user_marker_state WHERE user_id=?").run(id);
    d.prepare("DELETE FROM user_revealed_categories WHERE user_id=?").run(id);
    d.prepare("DELETE FROM user_preferences WHERE user_id=?").run(id);
    d.prepare("DELETE FROM users WHERE id=?").run(id);
  }
  d.close();
}
