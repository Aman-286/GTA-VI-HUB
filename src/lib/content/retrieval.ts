import { rows } from "@/lib/db";
import type { Entity } from "@/types/content";
// Future AI boundary. No provider dependency, network request or model key.
// Any future answer generator must cite these records and abstain on empty retrieval.
export async function retrieveVerified(question: string): Promise<Entity[]> {
  const terms = question.match(/[\p{L}\p{N}]+/gu)?.slice(0, 8);
  if (!terms?.length) return [];
  return rows<Entity>(
    "SELECT e.* FROM entity_search s JOIN entities e ON e.rowid=s.rowid WHERE entity_search MATCH ? AND e.status='published' AND e.is_demo=0 AND e.verification IN ('Official','Verified','Community Verified') AND EXISTS(SELECT 1 FROM entity_sources es WHERE es.entity_id=e.id) ORDER BY rank LIMIT 6",
    terms.map((t) => `"${t}"*`).join(" AND "),
  );
}
