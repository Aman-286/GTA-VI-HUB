import { z } from "zod";
import { sameOrigin, readJson, rateLimit, fail } from "@/lib/http";
import { db, first } from "@/lib/db";
import { searchAll } from "@/lib/db/content";
export async function POST(req: Request) {
  try {
    await sameOrigin(req);
    await rateLimit(req, "search-event", 20);
    const data = z
      .object({
        query: z.string().trim().min(2).max(100),
        entity_id: z.string().optional(),
      })
      .parse(await readJson(req, 2000));
    const query = data.query.toLowerCase();
    if (/@|https?:|\d{6}/i.test(query)) return Response.json({ ok: true });
    // Counted against the unfiltered index. Search analytics measure whether
    // the database can answer a question at all; folding one reader's spoiler
    // setting into the number would make "zero results" reports meaningless.
    const results = await searchAll(query);
    const click =
      data.entity_id &&
      results.some((r) => r.id === data.entity_id) &&
      (await first(
        "SELECT id FROM entities WHERE id=? AND status='published'",
        data.entity_id,
      ))
        ? data.entity_id
        : null;
    await (
      await db()
    )
      .prepare(
        "INSERT INTO search_events(id,query,result_count,clicked_entity_id) VALUES(?,?,?,?)",
      )
      .bind(crypto.randomUUID(), query, results.length, click)
      .run();
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
