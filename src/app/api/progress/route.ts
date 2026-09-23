import { currentUser, requireUser, HttpError } from "@/lib/auth/session";
import { sameOrigin, readJson, rateLimit, fail, privateJson } from "@/lib/http";
import { rows, db, first } from "@/lib/db";
import { z } from "zod";
import { spoilerContext } from "@/lib/spoilers/context";
import { visibleClause } from "@/lib/spoilers/sql";
/**
 * Reading a checklist is not a privileged action: a visitor who has never
 * interacted simply has an empty one. Answering 401 here forced every page
 * that renders a checklist to fetch, fail, mint a guest session and refetch --
 * two red console errors and three round trips before anything could render.
 * An empty 200 says the same thing without the error, and a session is now
 * minted lazily on the first write instead of on arrival.
 */
export async function GET() {
  try {
    const u = await currentUser();
    // `guest` lets the client mint a session before its first write instead of
    // discovering the need by provoking a 401, which showed up as a red console
    // error on the first interaction of every visit.
    if (!u)
      return privateJson({
        guest: true,
        progress: [],
        favorites: [],
        recent: [],
      });
    const visible = visibleClause(await spoilerContext());
    const [progress, favorites, recent] = await Promise.all([
      rows(
        `SELECT p.entity_id FROM user_progress p JOIN entities e ON e.id=p.entity_id WHERE p.user_id=? AND p.completed=1 AND e.status='published' AND ${visible.clause}`,
        u.id,
        ...visible.args,
      ),
      rows(
        `SELECT f.entity_id FROM favorites f JOIN entities e ON e.id=f.entity_id WHERE f.user_id=? AND e.status='published' AND ${visible.clause}`,
        u.id,
        ...visible.args,
      ),
      rows(
        `SELECT e.* FROM recent_views r JOIN entities e ON e.id=r.entity_id WHERE r.user_id=? AND e.status='published' AND ${visible.clause} ORDER BY r.viewed_at DESC LIMIT 12`,
        u.id,
        ...visible.args,
      ),
    ]);
    return privateJson({ guest: false, progress, favorites, recent });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    await sameOrigin(req);
    const u = await requireUser();
    await rateLimit(req, "progress", 90, u.id);
    const data = z
      .object({
        entity_id: z.string().max(100),
        type: z.enum(["progress", "favorite", "view"]),
        value: z.boolean(),
      })
      .parse(await readJson(req));
    if (
      !(await first(
        "SELECT id FROM entities WHERE id=? AND status='published'",
        data.entity_id,
      ))
    )
      throw new HttpError(404, "Record not found.");
    const d = await db();
    if (data.type === "view")
      await d
        .prepare(
          "INSERT INTO recent_views(user_id,entity_id) VALUES(?,?) ON CONFLICT(user_id,entity_id) DO UPDATE SET viewed_at=CURRENT_TIMESTAMP",
        )
        .bind(u.id, data.entity_id)
        .run();
    else if (data.type === "progress")
      await d
        .prepare(
          "INSERT INTO user_progress(user_id,entity_id,completed) VALUES(?,?,?) ON CONFLICT(user_id,entity_id) DO UPDATE SET completed=excluded.completed,updated_at=CURRENT_TIMESTAMP",
        )
        .bind(u.id, data.entity_id, +data.value)
        .run();
    else if (data.value)
      await d
        .prepare(
          "INSERT OR IGNORE INTO favorites(user_id,entity_id) VALUES(?,?)",
        )
        .bind(u.id, data.entity_id)
        .run();
    else
      await d
        .prepare("DELETE FROM favorites WHERE user_id=? AND entity_id=?")
        .bind(u.id, data.entity_id)
        .run();
    return privateJson({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
