import assert from "node:assert/strict";
const base = process.env.HUB_BASE_URL || "http://localhost:3000";
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname),
  "Local server required",
);
const queue = ["/", "/account", "/admin", "/submit", "/gta-6/map"],
  seen = new Set(),
  images = new Set();
while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  assert(seen.size <= 150, "Unexpectedly large crawl; inspect generated links");
  const response = await fetch(base + path);
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  const html = await response.text();
  assert(
    !html.includes('id="__next_error__"'),
    `${path} rendered an error boundary`,
  );
  for (const match of html.matchAll(/<a\b[^>]*href="([^"#]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (
      !href.startsWith("/") ||
      href.startsWith("//") ||
      href.startsWith("/api/")
    )
      continue;
    const url = new URL(href, base);
    if (!seen.has(url.pathname)) queue.push(url.pathname);
  }
  for (const match of html.matchAll(/<img\b[^>]*src="([^"]+)"/g)) {
    if (match[1].startsWith("/") && !match[1].startsWith("//"))
      images.add(match[1].replaceAll("&amp;", "&"));
  }
}
for (const path of images) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, `Missing image: ${path}`);
  assert(
    response.headers.get("content-type")?.startsWith("image/"),
    `Invalid image response: ${path}`,
  );
}
console.log(
  `PASS ${seen.size} linked HTML routes and ${images.size} server-rendered image URLs. This is an HTTP crawl, not browser rendering.`,
);
