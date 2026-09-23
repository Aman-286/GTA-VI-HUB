import { z } from "zod";
import { db, first, rows } from "@/lib/db";
import { currentUser } from "@/lib/auth/session";
import { sameOrigin, readJson, rateLimit, fail, privateJson } from "@/lib/http";
import {
  SPOILER_COOKIE,
  SPOILER_COOKIE_MAX_AGE,
  encodeSpoilerCookie,
  spoilerContext,
} from "@/lib/spoilers/context";
import { isConcealed, normalizeMode } from "@/lib/spoilers/policy";
import { cookies } from "next/headers";
import type { Entity } from "@/types/content";

const patch = z.object({
  mode: z.enum(["none", "minor", "all"]).optional(),
  /** An empty string clears the stored story position. */
  story_entity_id: z.string().max(100).nullable().optional(),
  reveal_category: z
    .string()
    .regex(/^[a-z-]{1,40}$/)
    .optional(),
  reveal_value: z.boolean().optional(),
});

interface MissionRow extends Entity {
  sequence: number | null;
}

/**
 * The story picker is itself a spoiler surface: a list of every mission name in
 * order tells a reader how the story is shaped. Entries whose own record is
 * concealed are returned without their title and identified by position only,
 * so a reader can still say "I am at mission 14" without being told what
 * mission 14 is.
 */
async function storyPicker() {
  const context = await spoilerContext();
  const missions = await rows<MissionRow>(
    "SELECT e.*,m.sequence FROM entities e JOIN missions m ON m.entity_id=e.id WHERE e.status='published' ORDER BY m.sequence IS NULL, m.sequence, e.title LIMIT 400",
  );
  return missions.map((m, index) => {
    const hidden = isConcealed(m, context);
    const position = m.sequence ?? index + 1;
    return {
      id: m.reveal_token || "",
      sequence: m.sequence,
      concealed: hidden,
      label: hidden
        ? m.safe_title?.trim() || `Mission ${position} (title hidden)`
        : m.title,
    };
  });
}

export async function GET() {
  try {
    const context = await spoilerContext();
    const user = await currentUser();
    const stored = user
      ? await first<{ story_entity_id: string | null }>(
          "SELECT e.reveal_token story_entity_id FROM user_preferences p LEFT JOIN entities e ON e.id=p.story_entity_id WHERE p.user_id=?",
          user.id,
        )
      : null;
    return privateJson({
      signed_in: Boolean(user?.email || user?.github_id),
      spoiler: {
        mode: context.mode,
        story_sequence: context.storySequence,
        story_entity_id: stored?.story_entity_id ?? null,
        revealed: [...context.revealed],
      },
      categories: await rows(
        "SELECT id,name,description FROM spoiler_categories ORDER BY name",
      ),
      missions: await storyPicker(),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    await sameOrigin(req);
    await rateLimit(req, "preferences", 60);
    const data = patch.parse(await readJson(req, 4096));
    const context = await spoilerContext();

    // Resolve the chosen mission to a story position server-side. A client
    // cannot post an arbitrary sequence number and reveal content that way.
    let storyEntityId = data.story_entity_id;
    let storySequence = context.storySequence;
    if (storyEntityId !== undefined) {
      if (!storyEntityId) {
        storyEntityId = null;
        storySequence = null;
      } else {
        const mission = await first<{
          entity_id: string;
          sequence: number | null;
        }>(
          "SELECT m.entity_id,m.sequence FROM missions m JOIN entities e ON e.id=m.entity_id WHERE (e.reveal_token=? OR m.entity_id=?) AND e.status='published'",
          storyEntityId,
          storyEntityId,
        );
        if (!mission) {
          storyEntityId = null;
          storySequence = null;
        } else {
          storySequence = mission.sequence ?? null;
          storyEntityId = mission.entity_id;
        }
      }
    }

    const mode = data.mode ? normalizeMode(data.mode) : context.mode;
    const revealed = new Set(context.revealed);
    if (data.reveal_category !== undefined) {
      if (data.reveal_value === false) revealed.delete(data.reveal_category);
      else revealed.add(data.reveal_category);
    }

    const user = await currentUser();
    const account = user?.email || user?.github_id ? user : null;
    if (account) {
      const d = await db();
      // A request that only changes the mode must not wipe a story position
      // the reader set earlier, so an omitted field reads back the stored one
      // rather than defaulting to null.
      if (storyEntityId === undefined) {
        const stored = await first<{
          story_entity_id: string | null;
          story_sequence: number | null;
        }>(
          "SELECT story_entity_id,story_sequence FROM user_preferences WHERE user_id=?",
          account.id,
        );
        storyEntityId = stored?.story_entity_id ?? null;
        storySequence = stored?.story_sequence ?? storySequence;
      }
      const statements = [
        d
          .prepare(
            "INSERT INTO user_preferences(user_id,spoiler_mode,story_entity_id,story_sequence,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET spoiler_mode=excluded.spoiler_mode,story_entity_id=excluded.story_entity_id,story_sequence=excluded.story_sequence,updated_at=CURRENT_TIMESTAMP",
          )
          .bind(account.id, mode, storyEntityId ?? null, storySequence),
      ];
      if (data.reveal_category !== undefined)
        statements.push(
          data.reveal_value === false
            ? d
                .prepare(
                  "DELETE FROM user_revealed_categories WHERE user_id=? AND category=?",
                )
                .bind(account.id, data.reveal_category)
            : d
                .prepare(
                  "INSERT OR IGNORE INTO user_revealed_categories(user_id,category) VALUES(?,?)",
                )
                .bind(account.id, data.reveal_category),
        );
      await d.batch(statements);
    }

    // The cookie is written for everyone, signed in or not. For a guest it is
    // the store; for an account it keeps server rendering correct on the very
    // next request and keeps the setting from appearing to reset after a sign
    // out.
    (await cookies()).set(
      SPOILER_COOKIE,
      encodeSpoilerCookie({ mode, storySequence, revealed }),
      {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: SPOILER_COOKIE_MAX_AGE,
      },
    );
    const storyToken = storyEntityId
      ? await first<{ reveal_token: string | null }>(
          "SELECT reveal_token FROM entities WHERE id=?",
          storyEntityId,
        )
      : null;
    return privateJson({
      ok: true,
      spoiler: {
        mode,
        story_sequence: storySequence,
        story_entity_id: storyToken?.reveal_token ?? null,
        revealed: [...revealed],
      },
    });
  } catch (e) {
    return fail(e);
  }
}
