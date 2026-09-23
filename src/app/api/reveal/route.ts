import { rows } from "@/lib/db";
import { fail, rateLimit } from "@/lib/http";
import type { Entity } from "@/types/content";

/**
 * "Reveal once" for a record that a listing sent masked.
 *
 * This endpoint deliberately does not consult the spoiler setting: being asked
 * for one specific record id, by id, is the reader's explicit instruction to
 * lift the cover for that record. Spoiler safety is a reading preference, not
 * an access-control boundary, and treating it as one would mean pretending the
 * data is protected when every record is public anyway.
 *
 * What it does guarantee is that nothing is revealed *by accident*: the
 * default responses of the listing, search, map and recommendation APIs all
 * conceal, and a record only leaves here when something asked for it by name.
 */
export async function GET(req: Request) {
  try {
    await rateLimit(req, "reveal", 120);
    const raw = new URL(req.url).searchParams.get("ids") || "";
    // Reveal tokens only. The primary key is not accepted here, because the
    // point of the token is that a concealed record's key was never sent.
    const ids = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[0-9a-f]{32}$/.test(s))
      .slice(0, 24);
    if (!ids.length)
      return Response.json(
        { items: [] },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    const items = await rows<Entity>(
      `SELECT * FROM entities WHERE status='published' AND reveal_token IN (${ids
        .map(() => "?")
        .join(",")})`,
      ...ids,
    );
    return Response.json(
      { items },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
