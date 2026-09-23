import { z } from "zod";
import { db, first } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth/session";
import { sameOrigin, readJson, rateLimit, fail, privateJson } from "@/lib/http";

/**
 * Per-marker reader state: "I have been here" and "come back to this".
 *
 * Kept apart from `/api/progress`, which is keyed by entity. One record can
 * have several markers, so "discovered" and "completed" are different claims --
 * and keeping them separate is what lets the map offer "hide completed" and
 * "visit later" as independent filters instead of one overloaded checkbox.
 */
const input = z.object({
  marker_id: z.string().max(160),
  discovered: z.boolean().optional(),
  visit_later: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await sameOrigin(req);
    const user = await requireUser();
    await rateLimit(req, "map-state", 120, user.id);
    const data = input.parse(await readJson(req, 2000));
    if (data.discovered === undefined && data.visit_later === undefined)
      throw new HttpError(400, "Nothing to change.");

    // The marker must exist and belong to a published record. Without this a
    // client could seed rows for ids of its own choosing.
    if (
      !(await first(
        "SELECT m.id FROM map_markers m JOIN entities e ON e.id=m.entity_id WHERE m.id=? AND e.status='published'",
        data.marker_id,
      ))
    )
      throw new HttpError(404, "Marker not found.");

    const d = await db();
    // COALESCE against the existing row so a request that sets one flag leaves
    // the other alone.
    await d
      .prepare(
        `INSERT INTO user_marker_state(user_id,marker_id,discovered,visit_later)
         VALUES(?,?,?,?)
         ON CONFLICT(user_id,marker_id) DO UPDATE SET
          discovered=COALESCE(?,user_marker_state.discovered),
          visit_later=COALESCE(?,user_marker_state.visit_later),
          updated_at=CURRENT_TIMESTAMP`,
      )
      .bind(
        user.id,
        data.marker_id,
        data.discovered === undefined ? 0 : +data.discovered,
        data.visit_later === undefined ? 0 : +data.visit_later,
        data.discovered === undefined ? null : +data.discovered,
        data.visit_later === undefined ? null : +data.visit_later,
      )
      .run();

    const state = await first<{ discovered: number; visit_later: number }>(
      "SELECT discovered,visit_later FROM user_marker_state WHERE user_id=? AND marker_id=?",
      user.id,
      data.marker_id,
    );
    return privateJson({
      ok: true,
      discovered: state?.discovered === 1,
      visit_later: state?.visit_later === 1,
    });
  } catch (e) {
    return fail(e);
  }
}
