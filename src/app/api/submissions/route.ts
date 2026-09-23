import { requireUser, HttpError } from "@/lib/auth/session";
import { db, environment, rows } from "@/lib/db";
import { submissionInput } from "@/lib/content/validation";
import { sameOrigin, readJson, rateLimit, fail, privateJson } from "@/lib/http";
export async function GET() {
  try {
    const u = await requireUser();
    return privateJson({
      items: await rows(
        "SELECT id,kind,title,status,review_note,created_at FROM submissions WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
        u.id,
      ),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    await sameOrigin(req);
    const user = await requireUser();
    await rateLimit(req, "submit", 3, user.id);
    const data = submissionInput.parse(await readJson(req, 12000)),
      env = await environment();
    if (env.TURNSTILE_SECRET_KEY) {
      if (!data.turnstileToken)
        throw new HttpError(400, "Complete the anti-spam check.");
      const result = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET_KEY,
            response: data.turnstileToken,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const verification = (await result.json()) as {
        success: boolean;
        hostname: string;
        action: string;
      };
      if (
        !verification.success ||
        verification.hostname !== new URL(env.SITE_URL).hostname ||
        verification.action !== "submission"
      )
        throw new HttpError(400, "The anti-spam check failed. Please retry.");
    } else if (new URL(env.SITE_URL).hostname !== "localhost")
      throw new HttpError(
        503,
        "Community submissions are temporarily closed while anti-spam protection is configured.",
      );
    const d = await db(),
      id = crypto.randomUUID();
    await d.batch([
      d
        .prepare(
          "INSERT INTO submissions(id,user_id,kind,title,description) VALUES(?,?,?,?,?)",
        )
        .bind(id, user.id, data.kind, data.title, data.description),
      d
        .prepare(
          "INSERT INTO submission_evidence(id,submission_id,url) VALUES(?,?,?)",
        )
        .bind(crypto.randomUUID(), id, data.url),
    ]);
    return privateJson({ id, status: "pending" });
  } catch (e) {
    return fail(e);
  }
}
