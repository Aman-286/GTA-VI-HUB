import { rows, first } from "@/lib/db";
import { fail } from "@/lib/http";
import { currentUser } from "@/lib/auth/session";
import { spoilerContext } from "@/lib/spoilers/context";
import { conceal } from "@/lib/spoilers/conceal";
import { visibleClause } from "@/lib/spoilers/sql";
import { MAP_HEIGHT, MAP_WIDTH, parseFilters } from "@/lib/map/viewport";
import type { Marker } from "@/types/content";

interface MarkerDetail extends Marker {
  subcategory: string;
  region_name: string | null;
  unlock_requirements: string;
  marker_verification: string;
  verified_at: string | null;
  version_label: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  notes: string;
  contributed: number;
}

/**
 * Everything the detail panel needs for one marker, in one query.
 *
 * These fields used to be hard-coded strings in the panel ("Demonstration
 * coast", "Fictional sample -- not applicable"). A companion that states a
 * requirement or a verification date has to be able to say where the claim
 * came from, so they are columns on the marker: one record can appear in
 * several places with different answers.
 */
const detailSelect = `SELECT e.*,m.id marker_id,m.category marker_category,m.x,m.y,
 m.subcategory,m.unlock_requirements,m.verification marker_verification,m.verified_at,m.notes,
 r.name region_name, gv.label version_label,
 mc.name category_name, sc.name subcategory_name,
 CASE WHEN m.created_by IS NULL THEN 0 ELSE 1 END contributed
 FROM map_markers m
 JOIN entities e ON e.id=m.entity_id
 LEFT JOIN regions r ON r.id=m.region_id
 LEFT JOIN game_versions gv ON gv.id=m.game_version_id
 LEFT JOIN marker_categories mc ON mc.id=m.category
 LEFT JOIN marker_categories sc ON sc.id=m.subcategory`;

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const context = await spoilerContext();
    const user = await currentUser();

    const marker = p.get("marker");
    if (marker) {
      const found = await first<MarkerDetail>(
        `${detailSelect} WHERE m.id=? AND e.status='published'`,
        marker.slice(0, 160),
      );
      if (!found)
        return Response.json(
          { marker: null },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      // A deep-linked marker is masked rather than dropped: the reader has a
      // URL in hand, so answering "nothing here" would read as a broken link.
      // The panel shows the safe stand-in and a reveal control instead.
      const explicitReveal =
        Boolean(found.reveal_token) && p.get("reveal") === found.reveal_token;
      const view = explicitReveal
        ? { ...found, concealed: false }
        : conceal(found, context);
      const state = user
        ? await first<{ discovered: number; visit_later: number }>(
            "SELECT discovered,visit_later FROM user_marker_state WHERE user_id=? AND marker_id=?",
            user.id,
            found.marker_id,
          )
        : null;
      return Response.json(
        {
          marker: {
            ...view,
            marker_id: found.marker_id,
            marker_category: view.concealed ? "" : found.marker_category,
            x: view.concealed ? 0 : found.x,
            y: view.concealed ? 0 : found.y,
            // Location, taxonomy and version metadata can themselves reveal
            // story information; return them only after an explicit reveal.
            subcategory: view.concealed ? "" : found.subcategory,
            // The display names, so the panel never shows a raw taxonomy id
            // such as "collectibles" where a reader expects "Collectibles".
            category_name: view.concealed
              ? null
              : found.category_name || found.marker_category,
            subcategory_name: view.concealed ? null : found.subcategory_name,
            region_name: view.concealed ? null : found.region_name,
            unlock_requirements: view.concealed
              ? ""
              : found.unlock_requirements,
            marker_verification: view.concealed
              ? ""
              : found.marker_verification,
            verified_at: view.concealed ? null : found.verified_at,
            version_label: view.concealed ? null : found.version_label,
            notes: view.concealed ? "" : found.notes,
            contributed: found.contributed,
            discovered: state?.discovered === 1,
            visit_later: state?.visit_later === 1,
          },
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const num = (key: string, fallback: number) => {
      const n = Number(p.get(key) ?? fallback);
      return Number.isFinite(n) ? n : fallback;
    };
    const x1 = Math.max(0, num("x1", 0)),
      y1 = Math.max(0, num("y1", 0)),
      x2 = Math.min(MAP_WIDTH, num("x2", MAP_WIDTH)),
      y2 = Math.min(MAP_HEIGHT, num("y2", MAP_HEIGHT));

    const filters = parseFilters(p);
    const args: unknown[] = [x1, x2, y1, y2];
    let filter = "";
    if (filters.category) {
      filter += " AND m.category=?";
      args.push(filters.category.slice(0, 60));
    }
    if (filters.subcategory) {
      filter += " AND m.subcategory=?";
      args.push(filters.subcategory.slice(0, 60));
    }
    if (filters.region) {
      filter += " AND m.region_id=?";
      args.push(filters.region.slice(0, 60));
    }

    // Progress-linked filters are only meaningful for someone with a session,
    // and are silently inert otherwise rather than erroring: a guest who has
    // never marked anything has nothing to hide and nothing saved.
    if (user && filters.hideCompleted) {
      filter +=
        " AND NOT EXISTS(SELECT 1 FROM user_progress up WHERE up.entity_id=e.id AND up.user_id=? AND up.completed=1)";
      args.push(user.id);
    }
    if (user && filters.visitLater) {
      filter +=
        " AND EXISTS(SELECT 1 FROM user_marker_state ums WHERE ums.marker_id=m.id AND ums.user_id=? AND ums.visit_later=1)";
      args.push(user.id);
    }
    if (!user && filters.visitLater) filter += " AND 0=1";

    // "Show only nearby" is measured from a marker the reader picked, not from
    // a device location: this is image space on a game map, so a GPS fix would
    // be meaningless. The radius is compared squared to avoid a square root
    // per row.
    if (filters.near) {
      const origin = await first<{ x: number; y: number }>(
        "SELECT x,y FROM map_markers WHERE id=?",
        filters.near.slice(0, 160),
      );
      if (origin) {
        filter += " AND ((m.x-?)*(m.x-?)+(m.y-?)*(m.y-?)) <= ?";
        args.push(
          origin.x,
          origin.x,
          origin.y,
          origin.y,
          filters.radius * filters.radius,
        );
      }
    }

    // Concealed markers are excluded in the query rather than filtered out of
    // the response. A pin's position is itself information -- an unexplained
    // marker on a late-game island says "something happens here" -- and the
    // cluster counts are computed by this same statement, so a marker removed
    // afterwards would leave a cluster promising more than it can show.
    const visible = visibleClause(context, "e");
    filter += ` AND ${visible.clause}`;
    args.push(...visible.args);

    const cell = Math.max(
      1,
      Math.round(70 / Math.pow(2, Math.min(5, Math.max(-2, num("zoom", 0))))),
    );
    const groups = await rows<{
      x: number;
      y: number;
      count: number;
      marker_id: string;
      cluster_id: string;
    }>(
      `SELECT AVG(m.x) x,AVG(m.y) y,COUNT(*) count,MIN(m.id) marker_id,'${cell}:'||CAST(m.x/${cell} AS INTEGER)||':'||CAST(m.y/${cell} AS INTEGER) cluster_id FROM map_markers m JOIN entities e ON e.id=m.entity_id WHERE m.map_id='demo-map' AND e.status='published' AND m.x BETWEEN ? AND ? AND m.y BETWEEN ? AND ? ${filter} GROUP BY CAST(m.x/${cell} AS INTEGER),CAST(m.y/${cell} AS INTEGER) ORDER BY CAST(m.x/${cell} AS INTEGER),CAST(m.y/${cell} AS INTEGER) LIMIT 251`,
      ...args,
    );
    const ids = groups
      .filter((g) => g.count === 1)
      .slice(0, 90)
      .map((g) => g.marker_id);
    const markers = ids.length
      ? await rows(
          `SELECT e.*,m.id marker_id,m.category marker_category,m.subcategory,m.x,m.y FROM map_markers m JOIN entities e ON e.id=m.entity_id WHERE m.id IN (${ids.map(() => "?").join(",")})`,
          ...ids,
        )
      : [];

    const withheldCount =
      context.mode === "all"
        ? 0
        : ((
            await first<{ n: number }>(
              `SELECT COUNT(*) n FROM map_markers m JOIN entities e ON e.id=m.entity_id WHERE m.map_id='demo-map' AND e.status='published' AND NOT ${visible.clause}`,
              ...visible.args,
            )
          )?.n ?? 0);

    return Response.json(
      {
        map: await first("SELECT * FROM maps WHERE id='demo-map'"),
        markers,
        clusters: groups.filter((g) => g.count > 1).slice(0, 250),
        truncated:
          groups.length > 250 ||
          groups.filter((g) => g.count === 1).length > 90,
        hidden: withheldCount,
      },
      {
        headers: {
          // Even an all-visible response depends on this reader's preference.
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    return fail(e);
  }
}
