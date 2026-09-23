import { cookies } from "next/headers";
import { db, environment, first, rows } from "@/lib/db";
import type { User } from "@/types/content";
export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function digest(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get("hub_session")?.value;
  if (!raw) return null;
  const user = await first<Omit<User, "roles">>(
    "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
    await digest(raw),
    Date.now(),
  );
  if (!user) return null;
  return {
    ...user,
    roles: (
      await rows<{ role: string }>(
        "SELECT role FROM roles WHERE user_id=?",
        user.id,
      )
    ).map((r) => r.role),
  };
}
export async function setSession(id: string, passwordHash?: string) {
  const raw = token(),
    hash = await digest(raw);
  const d = await db();
  const expires = Date.now() + 30 * 86400000;
  if (passwordHash) {
    const inserted = await d
      .prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM credentials WHERE user_id=? AND password_hash=?) RETURNING token_hash",
      )
      .bind(hash, id, expires, id, passwordHash)
      .first();
    if (!inserted)
      throw new HttpError(
        409,
        "Account credentials changed. Please sign in again.",
      );
  } else {
    await d
      .prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      )
      .bind(hash, id, expires)
      .run();
  }
  const env = await environment();
  (await cookies()).set("hub_session", raw, {
    httpOnly: true,
    secure: env.SITE_URL.startsWith("https:"),
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
}
export async function ensureGuest() {
  const current = await currentUser();
  if (current) return current;
  const id = crypto.randomUUID();
  const d = await db();
  await d
    .prepare("INSERT INTO users(id,username) VALUES(?,?)")
    .bind(id, "Guest explorer")
    .run();
  await setSession(id);
  return {
    id,
    username: "Guest explorer",
    github_id: null,
    roles: [],
  } satisfies User;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Start a guest session or sign in first.");
  return u;
}
export async function requireEditor() {
  const u = await requireUser();
  if (
    (!u.email && !u.github_id) ||
    !u.roles.some((r) => ["admin", "editor"].includes(r))
  )
    throw new HttpError(403, "An editor account is required.");
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if ((!u.email && !u.github_id) || !u.roles.includes("admin"))
    throw new HttpError(403, "An administrator account is required.");
  return u;
}
export async function endSession() {
  const jar = await cookies(),
    raw = jar.get("hub_session")?.value;
  if (raw)
    await (
      await db()
    )
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await digest(raw))
      .run();
  jar.delete("hub_session");
}
