import Papa from "papaparse";
import { entityInput } from "./validation";
export function parseImport(csv: string) {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const errors = parsed.errors.map(
    (e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`,
  );
  if (parsed.data.length > 50) errors.push("Import at most 50 rows per batch.");
  const rows = parsed.data
    .slice(0, 50)
    .map((row, i) => {
      const result = entityInput.safeParse({
        ...row,
        is_demo: row.is_demo === "1" ? 1 : 0,
        status: "draft",
        verification: "Unverified",
      });
      if (!result.success) {
        errors.push(
          `Row ${i + 2}: ${result.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`,
        );
        return null;
      }
      return result.data;
    })
    .filter((r) => r !== null);
  const slugs = new Set<string>();
  rows.forEach((r) => {
    const key = `${r.kind}/${r.slug}`;
    if (slugs.has(key)) errors.push(`Duplicate in file: ${key}`);
    slugs.add(key);
  });
  return { rows, errors };
}
