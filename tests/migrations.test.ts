import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
describe("upgrade preservation", () => {
  it("repairs historical imported tokens without changing existing data or corrupting search", () => {
    const d = new DatabaseSync(":memory:");
    try {
      for (const file of readdirSync("db/migrations")
        .sort()
        .filter((f) => f < "0006"))
        d.exec(readFileSync(`db/migrations/${file}`, "utf8"));
      d.exec(readFileSync("db/seed.sql", "utf8"));
      d.exec(
        "INSERT INTO users(id,username) VALUES('upgrade-test','Upgrade'); INSERT INTO favorites(user_id,entity_id) VALUES('upgrade-test','demo-touring-coupe'); UPDATE entities SET reveal_token=NULL WHERE id='demo-touring-coupe';",
      );
      const before = d
        .prepare(
          "SELECT id,title,body,status,revision FROM entities ORDER BY id",
        )
        .all();
      const existingToken = d
        .prepare(
          "SELECT reveal_token FROM entities WHERE id='demo-coastal-delivery'",
        )
        .get();
      d.exec(
        readFileSync("db/migrations/0006_repair_reveal_tokens.sql", "utf8"),
      );
      expect(
        d
          .prepare(
            "SELECT id,title,body,status,revision FROM entities ORDER BY id",
          )
          .all(),
      ).toEqual(before);
      expect(
        d
          .prepare(
            "SELECT reveal_token FROM entities WHERE id='demo-coastal-delivery'",
          )
          .get(),
      ).toEqual(existingToken);
      expect(
        d
          .prepare(
            "SELECT COUNT(*) n FROM entities WHERE reveal_token IS NULL OR reveal_token=''",
          )
          .get(),
      ).toMatchObject({ n: 0 });
      expect(
        d.prepare("SELECT * FROM favorites WHERE user_id='upgrade-test'").all(),
      ).toHaveLength(1);
      expect(d.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(() =>
        d.exec(
          "INSERT INTO entity_search(entity_search) VALUES('integrity-check')",
        ),
      ).not.toThrow();
    } finally {
      d.close();
    }
  });
});
