import { z } from "zod";
import { db, first } from "@/lib/db";
import {
  currentUser,
  endSession,
  setSession,
  digest,
  token,
  HttpError,
} from "@/lib/auth/session";
import { hashPassword, verifyPassword, dummyHash } from "@/lib/auth/password";
import { sameOrigin, rateLimit, readJson, privateJson, fail } from "@/lib/http";
import { adoptGuestPreferences } from "@/lib/spoilers/context";
const input = z.object({
  action: z.enum(["register", "login", "recover", "password"]),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
  username: z.string().trim().min(2).max(80).optional(),
  recovery: z.string().max(128).optional(),
  current_password: z.string().max(128).optional(),
});
export async function POST(req: Request) {
  try {
    await sameOrigin(req);
    await rateLimit(req, "credentials-ip", 10);
    const data = input.parse(await readJson(req, 4096));
    await rateLimit(req, "credentials-account", 8, data.email);
    const d = await db(),
      current = await currentUser();
    if (data.action === "register") {
      if (current?.email || current?.github_id)
        throw new HttpError(409, "Sign out before creating another account.");
      if (data.password.length < 12 || !data.username)
        throw new HttpError(
          400,
          "Enter a display name and a password of at least 12 characters.",
        );
      if (await first("SELECT id FROM users WHERE email=?", data.email))
        throw new HttpError(
          409,
          "An account with that email already exists. Sign in or use your recovery code.",
        );
      const id = current?.id || crypto.randomUUID(),
        recovery = token();
      const password = await hashPassword(data.password);
      const user = current
        ? d
            .prepare(
              "UPDATE users SET email=?,username=? WHERE id=? AND email IS NULL AND github_id IS NULL",
            )
            .bind(data.email, data.username, id)
        : d
            .prepare("INSERT INTO users(id,email,username) VALUES(?,?,?)")
            .bind(id, data.email, data.username);
      await d.batch([
        user,
        d
          .prepare(
            "INSERT INTO credentials(user_id,password_hash,recovery_hash) VALUES(?,?,?)",
          )
          .bind(id, password, await digest(recovery)),
        d.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
      ]);
      await adoptGuestPreferences(id);
      await setSession(id, password);
      return privateJson({ ok: true, recovery });
    }
    const account = await first<{
      id: string;
      password_hash: string;
      recovery_hash: string;
    }>(
      "SELECT u.id,c.password_hash,c.recovery_hash FROM users u JOIN credentials c ON c.user_id=u.id WHERE u.email=?",
      data.email,
    );
    if (data.action === "login") {
      const valid = await verifyPassword(
        data.password,
        account?.password_hash || dummyHash,
      );
      if (!account || !valid)
        throw new HttpError(401, "Email or password is incorrect.");
      if (
        current &&
        !current.email &&
        !current.github_id &&
        current.id !== account.id
      ) {
        await d.batch([
          d
            .prepare(
              "INSERT INTO user_progress(user_id,entity_id,completed) SELECT ?,entity_id,completed FROM user_progress WHERE user_id=? AND completed=1 ON CONFLICT(user_id,entity_id) DO UPDATE SET completed=1",
            )
            .bind(account.id, current.id),
          d
            .prepare(
              "INSERT OR IGNORE INTO favorites(user_id,entity_id) SELECT ?,entity_id FROM favorites WHERE user_id=?",
            )
            .bind(account.id, current.id),
          d
            .prepare(
              "INSERT OR IGNORE INTO recent_views(user_id,entity_id,viewed_at) SELECT ?,entity_id,viewed_at FROM recent_views WHERE user_id=?",
            )
            .bind(account.id, current.id),
          d
            .prepare(
              "INSERT INTO user_marker_state(user_id,marker_id,discovered,visit_later,updated_at) SELECT ?,marker_id,discovered,visit_later,updated_at FROM user_marker_state WHERE user_id=? ON CONFLICT(user_id,marker_id) DO UPDATE SET discovered=MAX(user_marker_state.discovered,excluded.discovered),visit_later=MAX(user_marker_state.visit_later,excluded.visit_later),updated_at=MAX(user_marker_state.updated_at,excluded.updated_at)",
            )
            .bind(account.id, current.id),
          d
            .prepare("UPDATE submissions SET user_id=? WHERE user_id=?")
            .bind(account.id, current.id),
          d.prepare("DELETE FROM sessions WHERE user_id=?").bind(current.id),
        ]);
      }
      await adoptGuestPreferences(account.id);
      await endSession();
      await setSession(account.id, account.password_hash);
      return privateJson({ ok: true });
    }
    if (data.password.length < 12)
      throw new HttpError(
        400,
        "Use at least 12 characters for your new password.",
      );
    if (data.action === "password") {
      if (
        !account ||
        current?.id !== account.id ||
        !(await verifyPassword(
          data.current_password || "",
          account.password_hash,
        ))
      )
        throw new HttpError(401, "Your current password is incorrect.");
    } else if (
      !account ||
      !data.recovery ||
      (await digest(data.recovery.trim())) !== account.recovery_hash
    ) {
      throw new HttpError(401, "Email or recovery code is incorrect.");
    }
    const recovery = token(),
      hashed = await hashPassword(data.password);
    // Conditional update ensures a recovery code cannot be consumed twice concurrently.
    const changed = await d.batch<{ meta: { changes: number } }>([
      d
        .prepare(
          "UPDATE credentials SET password_hash=?,recovery_hash=? WHERE user_id=? AND password_hash=? AND recovery_hash=? RETURNING user_id",
        )
        .bind(
          hashed,
          await digest(recovery),
          account!.id,
          account!.password_hash,
          account!.recovery_hash,
        ),
      d
        .prepare("DELETE FROM sessions WHERE user_id=? AND changes()=1")
        .bind(account!.id),
    ]);
    if (!changed[0].meta.changes)
      throw new HttpError(
        409,
        "Account credentials changed. Please try again.",
      );
    await endSession();
    await setSession(account!.id, hashed);
    return privateJson({ ok: true, recovery });
  } catch (e) {
    return fail(e);
  }
}
