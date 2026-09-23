import { ZodError } from "zod";
import { environment, db } from "@/lib/db";
import { HttpError, digest } from "@/lib/auth/session";
/**
 * Trust deployment configuration, never a caller-controlled Host header.
 * Local development may use another loopback port when 3000 is occupied.
 */
export async function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin)
    throw new HttpError(403, "This request must come from this website.");
  const env = await environment();
  const configured = new URL(env.SITE_URL);
  const requested = new URL(req.url);
  const allowed = new Set([configured.origin]);
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (loopback.has(configured.hostname) && loopback.has(requested.hostname))
    allowed.add(requested.origin);
  if (!allowed.has(origin))
    throw new HttpError(403, "This request must come from this website.");
}
export async function readJson(req: Request, max = 50000) {
  if (Number(req.headers.get("content-length") || 0) > max)
    throw new HttpError(413, "The request is too large.");
  const reader = req.body?.getReader();
  const decoder = new TextDecoder();
  let body = "",
    bytes = 0;
  if (reader) {
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > max) {
          await reader.cancel();
          throw new HttpError(413, "The request is too large.");
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export async function rateLimit(
  req: Request,
  scope: string,
  max = 30,
  userId = "",
) {
  const d = await db(),
    now = Date.now(),
    window = Math.floor(now / 60000),
    ip = req.headers.get("cf-connecting-ip") || "local";
  const key = await digest(`${scope}:${userId || ip}:${window}`);
  const result = await d
    .prepare(
      "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(key, (window + 1) * 60000)
    .first<{ count: number }>();
  if ((result?.count || 0) > max)
    throw new HttpError(
      429,
      "Too many requests. Please try again in a minute.",
    );
}
export function fail(e: unknown) {
  if (e instanceof HttpError)
    return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return Response.json(
      {
        error: e.issues
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  console.error(
    "Request failed",
    e instanceof Error ? e.message : "Unknown error",
  );
  return Response.json(
    {
      error:
        "Something went wrong. Your changes were not confirmed. Please try again.",
    },
    { status: 500 },
  );
}
export const privateJson = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
