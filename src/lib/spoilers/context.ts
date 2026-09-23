import { cache } from "react";
import { cookies } from "next/headers";
import { db, first, rows } from "@/lib/db";
import { currentUser } from "@/lib/auth/session";
import {
  defaultSpoilerContext,
  normalizeMode,
  type SpoilerContext,
  type SpoilerMode,
} from "./policy";

export const SPOILER_COOKIE = "hub_spoiler";
/** A year. The setting is a reading preference, not a credential. */
export const SPOILER_COOKIE_MAX_AGE = 31536000;

/**
 * Guest preference transport. Deliberately *not* HttpOnly and deliberately
 * readable: the server has to know the setting before it renders the first
 * byte of a listing, and the client has to know it to keep the settings panel
 * in sync without a round trip. It carries no identity and grants no access.
 *
 * Format: `mode|storySequence|category,category`. A plain delimited string
 * rather than JSON so a malformed cookie degrades to the safest setting
 * instead of throwing during render.
 */
export function encodeSpoilerCookie(context: SpoilerContext): string {
  const categories = [...context.revealed]
    .filter((c) => /^[a-z-]{1,40}$/.test(c))
    .join(",");
  return `${context.mode}|${context.storySequence ?? ""}|${categories}`;
}

export function decodeSpoilerCookie(raw: string | undefined): SpoilerContext {
  if (!raw) return defaultSpoilerContext;
  const [mode, sequence, categories = ""] = raw.slice(0, 500).split("|");
  const parsed = Number(sequence);
  return {
    mode: normalizeMode(mode),
    storySequence:
      sequence && Number.isFinite(parsed) && parsed >= 0
        ? Math.floor(parsed)
        : null,
    revealed: new Set(
      categories
        .split(",")
        .map((c) => c.trim())
        .filter((c) => /^[a-z-]{1,40}$/.test(c)),
    ),
  };
}

interface PreferenceRow {
  spoiler_mode: string;
  story_sequence: number | null;
}

/**
 * Resolved once per request. Several components on a page ask for it (a
 * listing, the header's settings control, a related-content rail) and each
 * answer would otherwise cost a session lookup plus two preference queries.
 */
export const spoilerContext = cache(async (): Promise<SpoilerContext> => {
  const jar = await cookies();
  const guest = decodeSpoilerCookie(jar.get(SPOILER_COOKIE)?.value);

  // A guest is a real `users` row -- the companion mints one so progress can be
  // stored before anyone signs up -- so "is there a session?" is the wrong
  // question to ask here. Only an account has a preferences row to read, and
  // the write path stores a guest's choice in the cookie, so reading the
  // database for a guest would ignore the setting they just made.
  const user = await currentUser().catch(() => null);
  const account = user?.email || user?.github_id ? user : null;
  if (!account) return guest;

  const [preference, revealed] = await Promise.all([
    first<PreferenceRow>(
      "SELECT spoiler_mode,story_sequence FROM user_preferences WHERE user_id=?",
      account.id,
    ),
    rows<{ category: string }>(
      "SELECT category FROM user_revealed_categories WHERE user_id=?",
      account.id,
    ),
  ]);
  // An account that has never expressed a preference keeps whatever the
  // browser was already set to, rather than snapping back to the default on
  // the first page after signing in.
  if (!preference) return guest;
  return {
    mode: normalizeMode(preference.spoiler_mode),
    storySequence:
      typeof preference.story_sequence === "number"
        ? preference.story_sequence
        : null,
    revealed: new Set(revealed.map((r) => r.category)),
  };
});

/** The story position a chosen mission represents, used to set the threshold. */
export async function missionSequence(entityId: string) {
  const row = await first<{ sequence: number | null }>(
    "SELECT m.sequence FROM missions m JOIN entities e ON e.id=m.entity_id WHERE m.entity_id=? AND e.status='published'",
    entityId,
  );
  return row ? (row.sequence ?? null) : undefined;
}

export const spoilerModeFromForm = (value: unknown): SpoilerMode =>
  normalizeMode(value);

/**
 * Carries a guest's cookie preference into an account the first time they sign
 * in or register. Without this a reader who chose "no spoilers" before making
 * an account would find the setting apparently reset the moment they did --
 * and would see spoilers on the page that loaded next.
 *
 * INSERT OR IGNORE, so an account that has already expressed a preference is
 * never overwritten by whatever cookie the browser happens to be carrying.
 */
export async function adoptGuestPreferences(userId: string) {
  const jar = await cookies();
  const guest = decodeSpoilerCookie(jar.get(SPOILER_COOKIE)?.value);
  const d = await db();
  // Insert category opt-ins only while the account has no preferences. The
  // entire batch is atomic, so a later login cannot silently expand opt-ins.
  const statements = [
    ...[...guest.revealed].map((category) =>
      d
        .prepare(
          "INSERT OR IGNORE INTO user_revealed_categories(user_id,category) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM user_preferences WHERE user_id=?)",
        )
        .bind(userId, category, userId),
    ),
    d
      .prepare(
        "INSERT OR IGNORE INTO user_preferences(user_id,spoiler_mode,story_sequence) VALUES(?,?,?)",
      )
      .bind(userId, guest.mode, guest.storySequence),
  ];
  await d.batch(statements);
}
