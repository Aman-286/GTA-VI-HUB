import { currentUser, ensureGuest, endSession } from "@/lib/auth/session";
import { sameOrigin, rateLimit, fail, privateJson } from "@/lib/http";
export async function GET() {
  try {
    return privateJson({ user: await currentUser() });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    await sameOrigin(req);
    await rateLimit(req, "session", 12);
    return privateJson({ user: await ensureGuest() });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request) {
  try {
    await sameOrigin(req);
    await endSession();
    return privateJson({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
