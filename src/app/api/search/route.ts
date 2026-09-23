import { search } from "@/lib/db/content";
import { fail, rateLimit } from "@/lib/http";
export async function GET(req: Request) {
  try {
    await rateLimit(req, "search", 90);
    const q = new URL(req.url).searchParams.get("q")?.slice(0, 120) || "";
    const { items, hidden } = await search(q);
    // `hidden` is reported rather than quietly dropped so the interface can
    // say "2 results hidden by your spoiler setting" instead of pretending the
    // database has nothing to offer.
    return Response.json(
      { items, hidden },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
