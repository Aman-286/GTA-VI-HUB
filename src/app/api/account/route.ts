import { requireUser } from "@/lib/auth/session";
import { db, rows } from "@/lib/db";
import { sameOrigin, readJson, fail, privateJson } from "@/lib/http";
import { z } from "zod";
export async function GET() {
  try {
    const u = await requireUser();
    return privateJson({
      user: u,
      progress: await rows(
        "SELECT entity_id,completed,updated_at FROM user_progress WHERE user_id=?",
        u.id,
      ),
      favorites: await rows(
        "SELECT entity_id,created_at FROM favorites WHERE user_id=?",
        u.id,
      ),
      submissions: await rows(
        "SELECT title,description,status,created_at FROM submissions WHERE user_id=?",
        u.id,
      ),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(req: Request) {
  try {
    await sameOrigin(req);
    const u = await requireUser();
    const { display_name } = z
      .object({ display_name: z.string().trim().min(2).max(80) })
      .parse(await readJson(req));
    const d = await db();
    await d.batch([
      d
        .prepare(
          "INSERT INTO profiles(user_id,display_name) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name",
        )
        .bind(u.id, display_name),
      d
        .prepare("UPDATE users SET username=? WHERE id=?")
        .bind(display_name, u.id),
    ]);
    return privateJson({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
