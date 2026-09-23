import { rows } from "@/lib/db";
import { fail, privateJson } from "@/lib/http";
import { currentUser } from "@/lib/auth/session";
import { spoilerContext } from "@/lib/spoilers/context";
import { visibleClause } from "@/lib/spoilers/sql";

/**
 * Per-category completion, counted in the database.
 *
 * The totals have to come from the same predicate the map draws with, or the
 * summary promises markers the reader cannot see: a concealed marker must not
 * be counted in either the total or the completed figure, otherwise "3 of 12"
 * silently becomes unreachable. That is why the spoiler rule exists as SQL as
 * well as a function.
 *
 * Never fabricated: a category with no markers reports zero and the interface
 * says so, rather than inventing a denominator.
 */
export async function GET() {
  try {
    const user = await currentUser();
    const context = await spoilerContext();
    const visible = visibleClause(context, "e");

    const totals = await rows<{
      category: string;
      name: string;
      total: number;
      completed: number;
      saved: number;
    }>(
      `SELECT mc.id category, mc.name,
        COUNT(m.id) total,
        COALESCE(SUM(CASE WHEN up.completed=1 THEN 1 ELSE 0 END),0) completed,
        COALESCE(SUM(CASE WHEN ums.visit_later=1 THEN 1 ELSE 0 END),0) saved
       FROM marker_categories mc
       LEFT JOIN map_markers m ON m.category=mc.id AND m.map_id='demo-map'
         AND m.entity_id IN (SELECT e.id FROM entities e WHERE e.status='published' AND ${visible.clause})
       LEFT JOIN entities e ON e.id=m.entity_id
       LEFT JOIN user_progress up ON up.entity_id=e.id AND up.user_id=?
       LEFT JOIN user_marker_state ums ON ums.marker_id=m.id AND ums.user_id=?
       WHERE mc.parent_id IS NULL
       GROUP BY mc.id, mc.name
       ORDER BY mc.position`,
      ...visible.args,
      user?.id ?? "",
      user?.id ?? "",
    );

    const overall = totals.reduce(
      (acc, t) => ({
        total: acc.total + t.total,
        completed: acc.completed + t.completed,
        saved: acc.saved + t.saved,
      }),
      { total: 0, completed: 0, saved: 0 },
    );

    return privateJson({
      signed_in: Boolean(user),
      overall,
      categories: totals,
    });
  } catch (e) {
    return fail(e);
  }
}
