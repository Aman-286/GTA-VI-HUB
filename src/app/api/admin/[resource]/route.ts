import { z } from "zod";
import { requireEditor, requireAdmin, HttpError } from "@/lib/auth/session";
import { db, rows, first } from "@/lib/db";
import { readJson, sameOrigin, rateLimit, fail, privateJson } from "@/lib/http";
import { saveEntity, domainFields } from "@/lib/content/editor";
import { safeUrl } from "@/lib/content/validation";
import { parseImport } from "@/lib/content/import";
import { Entity, kinds } from "@/types/content";
type Context = { params: Promise<{ resource: string }> };
export async function GET(req: Request, { params }: Context) {
  try {
    await requireEditor();
    const { resource } = await params,
      p = new URL(req.url).searchParams,
      id = p.get("id");
    if (resource === "entities" && id) {
      const entity = await first<Entity>(
        "SELECT * FROM entities WHERE id=?",
        id,
      );
      if (!entity) throw new HttpError(404, "Record not found.");
      return privateJson({
        entity,
        details: domainFields[entity.kind]
          ? await first(`SELECT * FROM ${entity.kind} WHERE entity_id=?`, id)
          : {},
        objectives: await rows(
          "SELECT title,instructions FROM mission_objectives WHERE mission_id=? ORDER BY position",
          id,
        ),
        codes: await rows(
          "SELECT platform,code FROM cheat_codes WHERE cheat_id=?",
          id,
        ),
        sources: await rows(
          "SELECT source_id,fact FROM entity_sources WHERE entity_id=?",
          id,
        ),
        revisions: await rows(
          "SELECT revision,created_at,changes FROM revisions WHERE entity_id=? ORDER BY revision DESC LIMIT 50",
          id,
        ),
      });
    }
    if (resource === "entities")
      return privateJson({
        items: await rows(
          "SELECT * FROM entities ORDER BY updated_at DESC LIMIT 100",
        ),
      });
    if (resource === "sources")
      return privateJson({
        items: await rows(
          "SELECT * FROM sources ORDER BY accessed_at DESC LIMIT 200",
        ),
      });
    if (resource === "submissions")
      return privateJson({
        items: await rows(
          "SELECT s.*,se.url FROM submissions s LEFT JOIN submission_evidence se ON se.submission_id=s.id ORDER BY s.created_at DESC LIMIT 100",
        ),
      });
    if (resource === "map")
      return privateJson({
        items: await rows(
          "SELECT m.*,e.title FROM map_markers m JOIN entities e ON e.id=m.entity_id ORDER BY e.title LIMIT 500",
        ),
        map: await first("SELECT * FROM maps WHERE id='demo-map'"),
      });
    if (resource === "analytics")
      return privateJson({
        searches: await rows(
          "SELECT query,COUNT(*) frequency,SUM(result_count=0) zero_results,SUM(clicked_entity_id IS NOT NULL) clicks FROM search_events WHERE created_at>datetime('now','-30 days') GROUP BY query ORDER BY frequency DESC LIMIT 30",
        ),
        favorites: await rows(
          "SELECT e.title,COUNT(*) n FROM favorites f JOIN entities e ON e.id=f.entity_id GROUP BY e.id ORDER BY n DESC LIMIT 10",
        ),
        views: await rows(
          "SELECT e.title,COUNT(*) n FROM recent_views r JOIN entities e ON e.id=r.entity_id GROUP BY e.id ORDER BY n DESC LIMIT 10",
        ),
        reports: await rows(
          "SELECT e.title,COUNT(*) n FROM reports r JOIN entities e ON e.id=r.entity_id WHERE r.resolved=0 GROUP BY e.id ORDER BY n DESC LIMIT 10",
        ),
      });
    if (resource === "users") {
      await requireAdmin();
      return privateJson({
        items: await rows(
          "SELECT u.id,u.username,u.github_id,u.email,GROUP_CONCAT(r.role) roles FROM users u LEFT JOIN roles r ON r.user_id=u.id WHERE (u.email IS NOT NULL OR u.github_id IS NOT NULL) GROUP BY u.id LIMIT 100",
        ),
      });
    }
    throw new HttpError(404, "Unknown editor resource.");
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request, { params }: Context) {
  try {
    await sameOrigin(req);
    const user = await requireEditor();
    await rateLimit(req, "editor", 60, user.id);
    const { resource } = await params,
      raw = await readJson(req, 250000),
      d = await db();
    if (resource === "entities")
      return privateJson(await saveEntity(raw, user));
    if (resource === "sources") {
      const data = z
        .object({
          title: z.string().trim().min(3).max(200),
          url: safeUrl,
          type: z.enum([
            "Official",
            "Own Gameplay",
            "Community",
            "Publication",
            "Video",
            "Forum",
            "Social",
            "Other",
          ]),
          notes: z.string().max(2000).default(""),
        })
        .parse(raw);
      const id = crypto.randomUUID();
      await d.batch([
        d
          .prepare(
            "INSERT INTO sources(id,title,url,type,notes) VALUES(?,?,?,?,?)",
          )
          .bind(id, data.title, data.url, data.type, data.notes),
        d
          .prepare(
            "INSERT INTO audit_logs(id,user_id,action,target_id) VALUES(?,?,?,?)",
          )
          .bind(crypto.randomUUID(), user.id, "source.create", id),
      ]);
      return privateJson({ id });
    }
    if (resource === "rollback") {
      const { id, revision, current_revision } = z
        .object({
          id: z.string(),
          revision: z.number().int(),
          current_revision: z.number().int(),
        })
        .parse(raw);
      const snapshot = await first<{ snapshot: string }>(
        "SELECT snapshot FROM revisions WHERE entity_id=? AND revision=?",
        id,
        revision,
      );
      if (!snapshot) throw new HttpError(404, "Revision not found.");
      const saved = JSON.parse(snapshot.snapshot);
      return privateJson(
        await saveEntity(
          {
            ...saved,
            seo_title: saved.seo_title || undefined,
            meta_description: saved.meta_description || undefined,
            id,
            revision: current_revision,
            status: "draft",
          },
          user,
        ),
      );
    }
    if (resource === "submissions") {
      const data = z
        .object({
          id: z.string(),
          status: z.enum(["approved", "rejected"]),
          note: z.string().trim().min(5).max(2000),
        })
        .parse(raw);
      const sub = await first<{ user_id: string; status: string }>(
        "SELECT user_id,status FROM submissions WHERE id=?",
        data.id,
      );
      if (!sub || sub.status !== "pending")
        throw new HttpError(409, "This submission has already been reviewed.");
      const decisionId = crypto.randomUUID();
      const result = await d.batch<{ meta: { changes: number } }>([
        d
          .prepare(
            "UPDATE submissions SET status=?,review_note=?,reviewer_id=? WHERE id=? AND status='pending'",
          )
          .bind(data.status, data.note, user.id, data.id),
        d
          .prepare(
            "INSERT INTO audit_logs(id,user_id,action,target_id,detail) SELECT ?,?,?,?,? WHERE changes()=1",
          )
          .bind(
            decisionId,
            user.id,
            `submission.${data.status}`,
            data.id,
            data.note,
          ),
        ...(data.status === "approved"
          ? [
              d
                .prepare(
                  "INSERT INTO reputation_events(id,user_id,submission_id,points,reason) SELECT ?,?,?,5,? WHERE EXISTS(SELECT 1 FROM audit_logs WHERE id=?)",
                )
                .bind(
                  crypto.randomUUID(),
                  sub.user_id,
                  data.id,
                  "Approved contribution",
                  decisionId,
                ),
            ]
          : []),
      ]);
      if (!result[0].meta.changes)
        throw new HttpError(409, "This submission has already been reviewed.");
      return privateJson({
        ok: true,
        message:
          "Review recorded. Create an editorial draft separately; nothing was published.",
      });
    }
    if (resource === "map") {
      const data = z
        .object({
          id: z.string().optional(),
          entity_id: z.string(),
          category: z.enum(kinds),
          x: z.number().min(0).max(1600),
          y: z.number().min(0).max(1000),
          source_id: z.string().nullable().optional(),
        })
        .parse(raw);
      if (!(await first("SELECT id FROM entities WHERE id=?", data.entity_id)))
        throw new HttpError(400, "Choose an existing entity.");
      const id = data.id || crypto.randomUUID();
      await d.batch([
        d
          .prepare(
            "INSERT INTO map_markers(id,map_id,entity_id,category,x,y,source_id) VALUES(?,'demo-map',?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET entity_id=excluded.entity_id,category=excluded.category,x=excluded.x,y=excluded.y,source_id=excluded.source_id",
          )
          .bind(
            id,
            data.entity_id,
            data.category,
            data.x,
            data.y,
            data.source_id || null,
          ),
        d
          .prepare(
            "INSERT INTO audit_logs(id,user_id,action,target_id,detail) VALUES(?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            user.id,
            "marker.save",
            id,
            JSON.stringify(data),
          ),
      ]);
      return privateJson({ id });
    }
    if (resource === "map-image") {
      const { image_url } = z
        .object({
          image_url: z
            .string()
            .regex(/^\/[a-zA-Z0-9/_-]+\.(svg|png|jpg|webp)$/)
            .max(200),
        })
        .parse(raw);
      await d
        .prepare("UPDATE maps SET image_url=? WHERE id='demo-map'")
        .bind(image_url)
        .run();
      return privateJson({ ok: true });
    }
    if (resource === "import") {
      const { csv, confirm } = z
        .object({
          csv: z.string().max(200000),
          confirm: z.boolean().default(false),
        })
        .parse(raw);
      const preview = parseImport(csv);
      for (const row of preview.rows)
        if (
          await first(
            "SELECT id FROM entities WHERE kind=? AND slug=?",
            row.kind,
            row.slug,
          )
        )
          preview.errors.push(`Already exists: ${row.kind}/${row.slug}`);
      if (!confirm || preview.errors.length)
        return privateJson({ ...preview, imported: 0 });
      const commands = [];
      for (const row of preview.rows) {
        const id = crypto.randomUUID();
        commands.push(
          d
            .prepare(
              "INSERT INTO entities(id,game_id,kind,title,slug,description,body,category,is_demo,status,verification,reveal_token) VALUES(?,'gta6',?,?,?,?,?,?,?,'draft','Unverified',?)",
            )
            .bind(
              id,
              row.kind,
              row.title,
              row.slug,
              row.description,
              row.body,
              row.category,
              row.is_demo,
              crypto.randomUUID().replaceAll("-", ""),
            ),
        );
        if (domainFields[row.kind])
          commands.push(
            d.prepare(`INSERT INTO ${row.kind}(entity_id) VALUES(?)`).bind(id),
          );
        commands.push(
          d
            .prepare(
              "INSERT INTO revisions(id,entity_id,editor_id,revision,snapshot,changes) VALUES(?,?,?,1,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              id,
              user.id,
              JSON.stringify({ ...row, id }),
              "CSV import",
            ),
        );
      }
      commands.push(
        d
          .prepare(
            "INSERT INTO audit_logs(id,user_id,action,detail) VALUES(?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            user.id,
            "import.create",
            `${preview.rows.length} drafts`,
          ),
      );
      try {
        await d.batch(commands);
      } catch {
        throw new HttpError(
          409,
          "Import conflicted with existing data. No rows were imported; preview again.",
        );
      }
      return privateJson({ imported: preview.rows.length, errors: [] });
    }
    if (resource === "roles") {
      await requireAdmin();
      const data = z
        .object({
          user_id: z.string(),
          role: z.enum(["admin", "editor", "contributor"]),
          enabled: z.boolean(),
        })
        .parse(raw);
      if (data.user_id === user.id && data.role === "admin" && !data.enabled)
        throw new HttpError(
          400,
          "You cannot remove your own administrator access.",
        );
      if (
        !(await first(
          "SELECT id FROM users WHERE id=? AND (email IS NOT NULL OR github_id IS NOT NULL)",
          data.user_id,
        ))
      )
        throw new HttpError(400, "Only signed-in accounts can receive roles.");
      await d.batch([
        data.enabled
          ? d
              .prepare("INSERT OR IGNORE INTO roles(user_id,role) VALUES(?,?)")
              .bind(data.user_id, data.role)
          : d
              .prepare("DELETE FROM roles WHERE user_id=? AND role=?")
              .bind(data.user_id, data.role),
        d
          .prepare(
            "INSERT INTO audit_logs(id,user_id,action,target_id,detail) VALUES(?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            user.id,
            "role.update",
            data.user_id,
            `${data.role}: ${data.enabled}`,
          ),
      ]);
      return privateJson({ ok: true });
    }
    throw new HttpError(404, "Unknown editor action.");
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request, { params }: Context) {
  try {
    await sameOrigin(req);
    const user = await requireEditor();
    const { resource } = await params;
    const { id } = z.object({ id: z.string() }).parse(await readJson(req));
    if (resource !== "map")
      throw new HttpError(400, "Archive content using the editor.");
    const d = await db();
    const old = await first("SELECT * FROM map_markers WHERE id=?", id);
    if (!old) throw new HttpError(404, "Marker not found.");
    await d.batch([
      d.prepare("DELETE FROM map_markers WHERE id=?").bind(id),
      d
        .prepare(
          "INSERT INTO audit_logs(id,user_id,action,target_id,detail) VALUES(?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          "marker.delete",
          id,
          JSON.stringify(old),
        ),
    ]);
    return privateJson({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
