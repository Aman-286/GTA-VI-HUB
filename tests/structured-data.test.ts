import { expect, it } from "vitest";
import { serializeStructuredData } from "@/lib/structured-data";
it("preserves JSON data without allowing an HTML script breakout", () => {
  const data = {
    name: '</script><script>alert("unsafe")</script>',
    text: "<tag>&normal",
  };
  const serialized = serializeStructuredData(data);
  expect(serialized).not.toContain("<");
  expect(serialized).toContain("\\u003c/script>");
  expect(JSON.parse(serialized)).toEqual(data);
});
