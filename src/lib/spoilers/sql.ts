import type { SpoilerContext } from "./policy";

/**
 * The spoiler policy expressed as a SQL predicate.
 *
 * Post-filtering rows in JavaScript is fine for a page of twenty records, but
 * wrong for anything aggregated: the map groups markers into clusters in SQL,
 * so a count computed before concealment would report "7 discoveries here" and
 * then draw three. The recommender and the completion totals have the same
 * problem. Those callers need the rule inside the query.
 *
 * The clause mirrors `isConcealed` exactly. `tests/spoilers.test.ts` runs both
 * against the same fixtures so the two cannot drift apart silently.
 */
export function visibleClause(
  context: SpoilerContext,
  alias = "e",
): { clause: string; args: unknown[] } {
  if (context.mode === "all") return { clause: "1=1", args: [] };

  const parts = [`${alias}.spoiler_level = 0`];
  const args: unknown[] = [];

  if (context.mode === "minor") parts.push(`${alias}.spoiler_level = 1`);

  if (context.storySequence !== null) {
    parts.push(
      `(${alias}.reveal_after_sequence IS NOT NULL AND ${alias}.reveal_after_sequence <= ?)`,
    );
    args.push(context.storySequence);
  }

  const revealed = [...context.revealed].filter((c) =>
    /^[a-z-]{1,40}$/.test(c),
  );
  if (revealed.length) {
    parts.push(
      `${alias}.spoiler_category IN (${revealed.map(() => "?").join(",")})`,
    );
    args.push(...revealed);
  }

  return { clause: `(${parts.join(" OR ")})`, args };
}
