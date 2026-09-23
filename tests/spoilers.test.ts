import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  isConcealed,
  normalizeMode,
  normalizeLevel,
  concealmentReason,
  placeholderTitle,
  type SpoilerContext,
} from "../src/lib/spoilers/policy";
import { conceal, withheld } from "../src/lib/spoilers/conceal";
import { visibleClause } from "../src/lib/spoilers/sql";
import {
  decodeSpoilerCookie,
  encodeSpoilerCookie,
} from "../src/lib/spoilers/context";
import type { Entity } from "../src/types/content";

const context = (over: Partial<SpoilerContext> = {}): SpoilerContext => ({
  mode: "none",
  storySequence: null,
  revealed: new Set(),
  ...over,
});

const record = (over: Partial<Entity> = {}): Entity =>
  ({
    id: "e1",
    kind: "missions",
    slug: "the-secret-ending",
    title: "The secret ending",
    description: "Everything is explained here.",
    body: "Long spoiler body.",
    category: "Finale",
    verification: "Unverified",
    is_demo: 1,
    status: "published",
    seo_title: "The secret ending",
    meta_description: "Everything is explained here.",
    image_url: "/spoiler.png",
    image_credit: "Demo",
    revision: 1,
    updated_at: "2026-01-01",
    spoiler_level: 2,
    spoiler_category: "ending",
    reveal_after_sequence: null,
    safe_title: null,
    safe_description: null,
    ...over,
  }) as Entity;

describe("spoiler policy", () => {
  it("never conceals a record that carries no spoiler", () => {
    for (const mode of ["none", "minor", "all"] as const)
      expect(isConcealed(record({ spoiler_level: 0 }), context({ mode }))).toBe(
        false,
      );
  });

  it('shows everything in "show everything" mode', () => {
    expect(isConcealed(record(), context({ mode: "all" }))).toBe(false);
  });

  it("treats minor mode as minor only", () => {
    const minor = context({ mode: "minor" });
    expect(isConcealed(record({ spoiler_level: 1 }), minor)).toBe(false);
    expect(isConcealed(record({ spoiler_level: 2 }), minor)).toBe(true);
  });

  it("conceals both levels for a reader who wants no spoilers", () => {
    expect(isConcealed(record({ spoiler_level: 1 }), context())).toBe(true);
    expect(isConcealed(record({ spoiler_level: 2 }), context())).toBe(true);
  });

  it("stops hiding content the reader has already played past", () => {
    const entity = record({ reveal_after_sequence: 5 });
    expect(isConcealed(entity, context({ storySequence: 4 }))).toBe(true);
    expect(isConcealed(entity, context({ storySequence: 5 }))).toBe(false);
    expect(isConcealed(entity, context({ storySequence: 9 }))).toBe(false);
  });

  it("treats an unstated story position as the very beginning", () => {
    expect(isConcealed(record({ reveal_after_sequence: 1 }), context())).toBe(
      true,
    );
  });

  it("honours an always-show category without lifting the others", () => {
    const revealed = context({ revealed: new Set(["ending"]) });
    expect(isConcealed(record({ spoiler_category: "ending" }), revealed)).toBe(
      false,
    );
    expect(isConcealed(record({ spoiler_category: "story" }), revealed)).toBe(
      true,
    );
  });

  it("falls back to the safest mode for unrecognised input", () => {
    expect(normalizeMode("everything")).toBe("none");
    expect(normalizeMode(undefined)).toBe("none");
    expect(normalizeMode("all")).toBe("all");
    expect(normalizeLevel("2")).toBe(2);
    expect(normalizeLevel(7)).toBe(0);
    expect(normalizeLevel(null)).toBe(0);
  });
});

describe("concealed records carry nothing to leak", () => {
  const hidden = conceal(record(), context());

  it("removes the title, description, body and slug", () => {
    const serialised = JSON.stringify(hidden);
    for (const secret of [
      "The secret ending",
      "the-secret-ending",
      "Everything is explained here.",
      "Long spoiler body.",
      "Finale",
      "/spoiler.png",
    ])
      expect(serialised).not.toContain(secret);
  });

  it("substitutes the editor's safe wording when there is one", () => {
    const withSafe = conceal(
      record({
        safe_title: "A later mission",
        safe_description: "Hidden for now.",
      }),
      context(),
    );
    expect(withSafe.title).toBe("A later mission");
    expect(withSafe.description).toBe("Hidden for now.");
  });

  it("falls back to a generic label when the editor wrote none", () => {
    expect(hidden.title).toBe("Hidden story content");
    expect(conceal(record({ spoiler_level: 1 }), context()).title).toBe(
      "Hidden gameplay detail",
    );
  });

  it("explains itself so the reveal control is meaningful", () => {
    expect(hidden.spoiler_reason).toContain("ending");
    expect(hidden.concealed).toBe(true);
  });

  it("passes a visible record through untouched", () => {
    const open = conceal(record(), context({ mode: "all" }));
    expect(open.title).toBe("The secret ending");
    expect(open.slug).toBe("the-secret-ending");
    expect(open.concealed).toBe(false);
  });

  it("drops rather than masks for search, and counts what it dropped", () => {
    const result = withheld(
      [record({ id: "a" }), record({ id: "b", spoiler_level: 0 })],
      context(),
    );
    expect(result.items.map((i) => i.id)).toEqual(["b"]);
    expect(result.hidden).toBe(1);
  });

  it("names a reason for every level even without a category", () => {
    expect(concealmentReason({ spoiler_level: 2 })).toContain("story");
    expect(concealmentReason({ spoiler_level: 1 })).toContain("gameplay");
    expect(placeholderTitle({ spoiler_level: 2 })).toBe("Hidden story content");
  });
});

describe("guest preference cookie", () => {
  it("round-trips a full context", () => {
    const original = context({
      mode: "minor",
      storySequence: 12,
      revealed: new Set(["story", "ending"]),
    });
    const back = decodeSpoilerCookie(encodeSpoilerCookie(original));
    expect(back.mode).toBe("minor");
    expect(back.storySequence).toBe(12);
    expect([...back.revealed].sort()).toEqual(["ending", "story"]);
  });

  it("degrades a malformed cookie to the safest setting", () => {
    for (const raw of ["", "garbage", "all-ish|x|", "|||", undefined]) {
      const back = decodeSpoilerCookie(raw);
      expect(back.mode).toBe("none");
      expect(back.storySequence).toBe(null);
    }
  });

  it("refuses category names that are not plain slugs", () => {
    const back = decodeSpoilerCookie("all|3|story,DROP TABLE,../x,ending");
    expect([...back.revealed].sort()).toEqual(["ending", "story"]);
    expect(back.mode).toBe("all");
  });
});

/**
 * The map clusters markers in SQL, so the rule exists twice: once in
 * `isConcealed` and once in `visibleClause`. If the two ever disagree the map
 * will draw a cluster of seven and open three. This runs both against the same
 * rows in a real SQLite database and requires identical answers.
 */
describe("the SQL predicate agrees with the policy function", () => {
  const database = () => {
    const d = new DatabaseSync(":memory:");
    for (const file of [
      "db/migrations/0001_foundation.sql",
      "db/migrations/0002_local_accounts.sql",
      "db/migrations/0003_spoilers.sql",
    ])
      d.exec(readFileSync(file, "utf8"));
    d.exec("INSERT INTO games VALUES('g','g','Game')");
    return d;
  };

  const fixtures: Partial<Entity>[] = [
    { spoiler_level: 0, spoiler_category: "", reveal_after_sequence: null },
    {
      spoiler_level: 1,
      spoiler_category: "mechanic",
      reveal_after_sequence: null,
    },
    {
      spoiler_level: 2,
      spoiler_category: "story",
      reveal_after_sequence: null,
    },
    { spoiler_level: 2, spoiler_category: "ending", reveal_after_sequence: 3 },
    {
      spoiler_level: 1,
      spoiler_category: "side-content",
      reveal_after_sequence: 8,
    },
    { spoiler_level: 2, spoiler_category: "", reveal_after_sequence: 1 },
  ];

  const contexts: SpoilerContext[] = [
    context(),
    context({ mode: "minor" }),
    context({ mode: "all" }),
    context({ storySequence: 0 }),
    context({ storySequence: 3 }),
    context({ storySequence: 10 }),
    context({ revealed: new Set(["story"]) }),
    context({ mode: "minor", revealed: new Set(["ending"]) }),
    context({ storySequence: 5, revealed: new Set(["mechanic"]) }),
  ];

  it("returns the same verdict for every fixture in every mode", () => {
    const d = database();
    fixtures.forEach((f, i) => {
      d.prepare(
        "INSERT INTO entities(id,game_id,kind,slug,title,description,body,category,spoiler_level,spoiler_category,reveal_after_sequence,status) VALUES(?,'g','missions',?,?,'d','b','',?,?,?,'published')",
      ).run(
        `e${i}`,
        `s${i}`,
        `t${i}`,
        f.spoiler_level!,
        f.spoiler_category!,
        f.reveal_after_sequence ?? null,
      );
    });

    for (const ctx of contexts) {
      const { clause, args } = visibleClause(ctx, "e");
      const visibleIds = d
        .prepare(`SELECT id FROM entities e WHERE ${clause} ORDER BY id`)
        .all(...(args as string[])) as { id: string }[];
      const expected = fixtures
        .map((f, i) => ({ id: `e${i}`, f }))
        .filter(({ f }) => !isConcealed(f, ctx))
        .map(({ id }) => id);
      expect(visibleIds.map((r) => r.id)).toEqual(expected);
    }
    d.close();
  });
});
