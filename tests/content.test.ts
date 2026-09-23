import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { publicationError, safeUrl } from "../src/lib/content/validation";
import { parseImport } from "../src/lib/content/import";
/**
 * Every migration in order, not just the first. Pinning this to
 * `0001_foundation.sql` meant the seed silently stopped matching the schema
 * the moment a later migration added a column the seed writes to.
 */
const fixture = () => {
  const d = new DatabaseSync(":memory:");
  for (const file of readdirSync("db/migrations").sort())
    d.exec(readFileSync(`db/migrations/${file}`, "utf8"));
  d.exec(readFileSync("db/seed.sql", "utf8"));
  return d;
};
describe("content evidence policy", () => {
  it("refuses verified demos even with evidence", () => {
    expect(
      publicationError(
        {
          is_demo: 1,
          verification: "Verified",
          status: "published",
          description: "Example",
          body: "x".repeat(100),
        },
        2,
      ),
    ).toContain("Demo");
  });
  it("requires evidence for verified publication", () => {
    expect(
      publicationError(
        {
          is_demo: 0,
          verification: "Verified",
          status: "published",
          description: "Example",
          body: "x".repeat(100),
        },
        0,
      ),
    ).toContain("source");
  });
  it("rejects thin publication but allows drafting", () => {
    expect(
      publicationError(
        {
          is_demo: 0,
          verification: "Unverified",
          status: "published",
          description: "Example",
          body: "short",
        },
        0,
      ),
    ).toContain("80");
    expect(
      publicationError(
        {
          is_demo: 0,
          verification: "Unverified",
          status: "draft",
          description: "Example",
          body: "",
        },
        0,
      ),
    ).toBeNull();
  });
  it("rejects executable and credential-bearing links", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>x</script>",
      "https://u:p@example.com",
    ])
      expect(safeUrl.safeParse(url).success).toBe(false);
    expect(safeUrl.safeParse("https://example.com/source").success).toBe(true);
  });
});
describe("relational schema and search", () => {
  it("applies and seeds repeatedly without duplicates or foreign key violations", () => {
    const d = fixture();
    d.exec(readFileSync("db/seed.sql", "utf8"));
    expect(d.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(d.prepare("SELECT COUNT(*) n FROM entities").get()).toMatchObject({
      n: 28,
    });
    d.close();
  });
  /**
   * Guards the failure that a trigger-based reveal token caused: an AFTER
   * INSERT trigger updating `entities` raced the FTS5 external-content triggers
   * on the same table and left the index corrupt, so every later query died
   * with "database disk image is malformed". The integrity command is the only
   * thing that catches it before a query does.
   */
  it("keeps the search index consistent with its content table", () => {
    const d = fixture();
    expect(() =>
      d.exec(
        "INSERT INTO entity_search(entity_search) VALUES('integrity-check')",
      ),
    ).not.toThrow();
    d.close();
  });

  it("gives every record an opaque reveal token distinct from its id", () => {
    const d = fixture();
    const { missing } = d
      .prepare(
        "SELECT COUNT(*) missing FROM entities WHERE reveal_token IS NULL OR reveal_token=id",
      )
      .get() as { missing: number };
    expect(missing).toBe(0);
    const { total, distinct_tokens } = d
      .prepare(
        "SELECT COUNT(*) total, COUNT(DISTINCT reveal_token) distinct_tokens FROM entities",
      )
      .get() as { total: number; distinct_tokens: number };
    expect(distinct_tokens).toBe(total);
    d.close();
  });

  it("finds a helicopter through FTS and updates its index", () => {
    const d = fixture();
    expect(
      d
        .prepare(
          "SELECT title FROM entity_search WHERE entity_search MATCH '\"helicopter\"*'",
        )
        .all(),
    ).toHaveLength(1);
    d.exec(
      "UPDATE entities SET title='Rotary aircraft',description='Fictional sample aircraft',body='No factual gameplay claim' WHERE slug='coastal-helicopter'",
    );
    expect(
      d
        .prepare(
          "SELECT title FROM entity_search WHERE entity_search MATCH '\"helicopter\"*'",
        )
        .all(),
    ).toHaveLength(0);
    d.close();
  });
  it("enforces demo verification and coordinate bounds in the database", () => {
    const d = fixture();
    expect(() =>
      d.exec(
        "UPDATE entities SET verification='Official' WHERE id='demo-touring-coupe'",
      ),
    ).toThrow();
    expect(() => d.exec("UPDATE map_markers SET x=1601")).toThrow();
    d.close();
  });
  it("uses the listing index and isolates progress by user", () => {
    const d = fixture();
    expect(
      JSON.stringify(
        d
          .prepare(
            "EXPLAIN QUERY PLAN SELECT * FROM entities WHERE kind='vehicles' AND status='published' ORDER BY updated_at DESC LIMIT 24",
          )
          .all(),
      ),
    ).toContain("idx_entities_listing");
    d.exec(
      "INSERT INTO users(id,username) VALUES('a','A'),('b','B'); INSERT INTO user_progress VALUES('a','demo-touring-coupe',1,CURRENT_TIMESTAMP)",
    );
    expect(
      d.prepare("SELECT * FROM user_progress WHERE user_id='b'").all(),
    ).toHaveLength(0);
    d.close();
  });
});
describe("CSV staging", () => {
  it("handles quoted commas and forces unverified draft status", () => {
    const csv =
      'kind,title,slug,description,body,status,verification,is_demo\nvehicles,"Demo, coupe",test-coupe,An explicitly fictional example record,This is a demonstration body,published,Official,1';
    const p = parseImport(csv);
    expect(p.errors).toEqual([]);
    expect(p.rows[0]).toMatchObject({
      title: "Demo, coupe",
      status: "draft",
      verification: "Unverified",
      is_demo: 1,
    });
  });
  it("detects duplicates and invalid slugs", () => {
    const row =
      "vehicles,Sample coupe,sample-coupe,A sufficiently long demo description";
    const p = parseImport(`kind,title,slug,description\n${row}\n${row}`);
    expect(p.errors.join()).toContain("Duplicate");
    expect(
      parseImport(
        "kind,title,slug,description\nvehicles,Example,<script>,A long enough description here",
      ).errors.length,
    ).toBeGreaterThan(0);
  });
});
