import { z } from "zod";
import { db, first, rows } from "@/lib/db";
import { entityInput, publicationError } from "./validation";
import { HttpError } from "@/lib/auth/session";
import type { Entity, User } from "@/types/content";
import { domainFields } from "./fields";
const scalar = z.union([z.string().max(3000), z.number().finite(), z.null()]);
export const editorInput = entityInput.extend({
  details: z.record(z.string(), scalar).optional(),
  codes: z
    .array(
      z.object({
        platform: z.enum(["PS5", "Xbox", "Phone"]),
        code: z.string().trim().min(1).max(500),
      }),
    )
    .max(3)
    .optional(),
  objectives: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        instructions: z.string().min(10).max(5000),
      }),
    )
    .max(50)
    .optional(),
});
const numeric = new Set([
  "sequence",
  "speed",
  "acceleration",
  "handling",
  "braking",
  "seats",
  "price",
  "damage",
  "range",
  "accuracy",
  "fire_rate",
  "magazine",
  "points",
  "reading_minutes",
  "x",
  "y",
]);
export async function saveEntity(raw: unknown, user: User) {
  const data = editorInput.parse(raw),
    d = await db();
  const old = data.id
    ? await first<Entity>("SELECT * FROM entities WHERE id=?", data.id)
    : null;
  if (data.id && !old) throw new HttpError(404, "Record not found.");
  if (old && data.revision !== old.revision)
    throw new HttpError(
      409,
      "This record changed in another session. Reload before saving.",
    );
  if (old && old.kind !== data.kind)
    throw new HttpError(400, "The record type cannot change.");
  const priorDetails =
    old && domainFields[old.kind]
      ? await first<Record<string, string | number | null>>(
          `SELECT * FROM ${old.kind} WHERE entity_id=?`,
          old.id,
        )
      : {};
  if (priorDetails) delete priorDetails.entity_id;
  const priorObjectives =
    old?.kind === "missions"
      ? await rows(
          "SELECT title,instructions FROM mission_objectives WHERE mission_id=? ORDER BY position",
          old.id,
        )
      : [];
  const priorCodes =
    old?.kind === "cheats"
      ? await rows(
          "SELECT platform,code FROM cheat_codes WHERE cheat_id=?",
          old.id,
        )
      : [];
  if (
    data.codes &&
    new Set(data.codes.map((c) => c.platform)).size !== data.codes.length
  )
    throw new HttpError(400, "Enter at most one code per platform.");
  if (
    data.kind === "cheats" &&
    data.codes?.length &&
    (data.is_demo ||
      !["Official", "Verified", "Community Verified"].includes(
        data.verification,
      ))
  )
    throw new HttpError(
      400,
      "Only source-verified, non-demo cheat records may contain codes.",
    );
  const sourceCount =
    (
      await first<{ n: number }>(
        "SELECT COUNT(*) n FROM entity_sources WHERE entity_id=?",
        old?.id || "",
      )
    )?.n || 0;
  const suppliedSource = data.source_id
    ? await first<{ type: string }>(
        "SELECT type FROM sources WHERE id=?",
        data.source_id,
      )
    : null;
  if (data.source_id && !suppliedSource)
    throw new HttpError(400, "Source not found.");
  if (suppliedSource && !data.fact?.trim())
    throw new HttpError(400, "Describe the fact supported by the source.");
  const violation = publicationError(
    data,
    sourceCount + (suppliedSource ? 1 : 0),
  );
  if (violation) throw new HttpError(400, violation);
  if (
    data.verification === "Official" &&
    suppliedSource?.type !== "Official" &&
    !(await first(
      "SELECT s.id FROM sources s JOIN entity_sources es ON es.source_id=s.id WHERE es.entity_id=? AND s.type='Official'",
      old?.id || "",
    ))
  )
    throw new HttpError(
      400,
      "Official verification requires an official source.",
    );
  const id = old?.id || crypto.randomUUID(),
    revision = (old?.revision || 0) + 1;
  const columns = [
    "title",
    "slug",
    "description",
    "body",
    "category",
    "verification",
    "is_demo",
    "status",
    "seo_title",
    "meta_description",
    "spoiler_level",
    "spoiler_category",
    "reveal_after_sequence",
    "safe_title",
    "safe_description",
  ];
  const values = columns.map((c) => data[c as keyof typeof data] ?? null);
  const commands = [];
  if (old) {
    commands.push(
      d
        .prepare(
          "INSERT OR IGNORE INTO revisions(id,entity_id,editor_id,revision,snapshot,changes) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          user.id,
          old.revision,
          JSON.stringify({
            ...old,
            details: priorDetails,
            objectives: priorObjectives,
            codes: priorCodes,
          }),
          "Saved prior version",
        ),
    );
    commands.push(
      d
        .prepare(
          `UPDATE entities SET ${columns.map((c) => `${c}=?`).join(",")},revision=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?`,
        )
        .bind(...values, revision, id, old.revision),
    );
  } else
    commands.push(
      d
        .prepare(
          `INSERT INTO entities(id,game_id,kind,${columns.join(",")},revision,reveal_token) VALUES(?,'gta6',?,${columns.map(() => "?").join(",")},?,?)`,
        )
        // The opaque handle a concealed record is revealed by. Minted here
        // rather than by a database trigger: an AFTER INSERT trigger that
        // updates `entities` races the FTS5 external-content triggers on the
        // same table and corrupts the search index. See
        // db/migrations/0004_reveal_tokens.sql.
        .bind(
          id,
          data.kind,
          ...values,
          revision,
          crypto.randomUUID().replaceAll("-", ""),
        ),
    );
  const fields = domainFields[data.kind];
  if (fields) {
    const details = data.details || {};
    for (const f of Object.keys(details)) {
      if (!fields.includes(f))
        throw new HttpError(400, `Unsupported field: ${f}`);
      if (
        numeric.has(f) &&
        details[f] !== null &&
        details[f] !== "" &&
        (!Number.isFinite(Number(details[f])) || Number(details[f]) < 0)
      )
        throw new HttpError(400, `${f} must be a non-negative number.`);
    }
    const selected = fields.filter((f) => Object.hasOwn(details, f));
    const parsed = selected.map((f) =>
      details[f] === ""
        ? null
        : numeric.has(f) && details[f] !== null
          ? Number(details[f])
          : details[f],
    );
    commands.push(
      selected.length
        ? d
            .prepare(
              `INSERT INTO ${data.kind}(entity_id,${selected.join(",")}) VALUES(?,${selected.map(() => "?").join(",")}) ON CONFLICT(entity_id) DO UPDATE SET ${selected.map((f) => `${f}=excluded.${f}`).join(",")}`,
            )
            .bind(id, ...parsed)
        : d
            .prepare(`INSERT OR IGNORE INTO ${data.kind}(entity_id) VALUES(?)`)
            .bind(id),
    );
  }
  if (data.kind === "missions" && data.objectives) {
    commands.push(
      d.prepare("DELETE FROM mission_objectives WHERE mission_id=?").bind(id),
    );
    data.objectives.forEach((o, i) =>
      commands.push(
        d
          .prepare(
            "INSERT INTO mission_objectives(id,mission_id,position,title,instructions) VALUES(?,?,?,?,?)",
          )
          .bind(crypto.randomUUID(), id, i + 1, o.title, o.instructions),
      ),
    );
  }
  if (suppliedSource)
    commands.push(
      d
        .prepare(
          "INSERT INTO entity_sources(entity_id,source_id,fact) VALUES(?,?,?) ON CONFLICT(entity_id,source_id) DO UPDATE SET fact=excluded.fact",
        )
        .bind(id, data.source_id, data.fact),
    );
  if (data.kind === "cheats" && data.codes) {
    commands.push(
      d.prepare("DELETE FROM cheat_codes WHERE cheat_id=?").bind(id),
    );
    for (const c of data.codes)
      commands.push(
        d
          .prepare(
            "INSERT INTO cheat_codes(id,cheat_id,platform,code) VALUES(?,?,?,?)",
          )
          .bind(crypto.randomUUID(), id, c.platform, c.code),
      );
  }
  commands.push(
    d
      .prepare(
        "INSERT INTO revisions(id,entity_id,editor_id,revision,snapshot,changes) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        user.id,
        revision,
        JSON.stringify({
          ...data,
          id,
          revision,
          details: { ...priorDetails, ...data.details },
          objectives: data.objectives ?? priorObjectives,
          codes: data.codes ?? priorCodes,
        }),
        old ? "Editorial update" : "Created record",
      ),
    d
      .prepare(
        "INSERT INTO audit_logs(id,user_id,action,target_id,detail) VALUES(?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        user.id,
        "entity.save",
        id,
        `Revision ${revision}; ${data.status}; ${data.verification}`,
      ),
  );
  try {
    await d.batch(commands);
  } catch (e) {
    if ((e as Error).message.includes("UNIQUE"))
      throw new HttpError(
        409,
        "That slug or revision already exists. Reload or use a different slug.",
      );
    throw e;
  }
  return { id, revision };
}
export { domainFields };
