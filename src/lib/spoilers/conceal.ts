import type { Entity } from "@/types/content";
import {
  concealmentReason,
  isConcealed,
  normalizeLevel,
  placeholderTitle,
  type SpoilerContext,
  type SpoilerFields,
} from "./policy";

/**
 * What every public surface renders. A concealed view keeps the shape of an
 * Entity so existing listings keep compiling, but each field that could carry
 * the secret has been replaced before it leaves the server:
 *
 *   title        -> the editor's safe title, or a generic label
 *   description  -> the editor's safe description, or a generic line
 *   body         -> emptied
 *   slug         -> emptied, because a slug is a sentence ("the-death-of-...")
 *   category     -> emptied, because categories name story acts
 *   image/SEO    -> emptied, because thumbnails and link previews leak too
 *
 * `concealed` is the single flag a component branches on. `EntityRow` and the
 * detail route handle it centrally so a new listing cannot forget.
 */
export interface EntityView extends Entity {
  concealed: boolean;
  spoiler_reason: string;
}

export function conceal(entity: Entity, context: SpoilerContext): EntityView {
  if (!isConcealed(entity as SpoilerFields, context))
    return { ...entity, concealed: false, spoiler_reason: "" };
  const fields = entity as Entity & SpoilerFields & { safe_title?: string };
  return {
    // The primary key never leaves the server for a concealed record: a
    // readable id such as `demo-after-hours` would spell out the very title
    // this record is withholding. The opaque token is what "reveal once" asks
    // for, and it is all a listing needs as a React key.
    id: entity.reveal_token || "",
    kind: entity.kind,
    slug: "",
    title: entity.safe_title?.trim() || placeholderTitle(fields),
    description:
      entity.safe_description?.trim() ||
      "This record is hidden to match your spoiler setting.",
    body: "",
    category: "",
    verification: entity.verification,
    is_demo: entity.is_demo,
    status: entity.status,
    seo_title: null,
    meta_description: null,
    image_url: null,
    image_credit: null,
    revision: entity.revision,
    updated_at: entity.updated_at,
    spoiler_level: normalizeLevel(entity.spoiler_level),
    spoiler_category: entity.spoiler_category || "",
    reveal_after_sequence: null,
    safe_title: null,
    safe_description: null,
    reveal_token: entity.reveal_token,
    concealed: true,
    spoiler_reason: concealmentReason(fields),
  };
}

export const concealAll = (entities: Entity[], context: SpoilerContext) =>
  entities.map((e) => conceal(e, context));

/**
 * Search and recommendation results drop concealed records entirely instead of
 * showing a placeholder. A full-text hit can be caused by a word that only
 * appears in the hidden body, so returning even a masked row tells the reader
 * that their search term matched something -- which is the spoiler. The caller
 * reports the count so the omission is honest rather than silent.
 */
export function withheld<T extends Entity>(
  entities: T[],
  context: SpoilerContext,
): { items: T[]; hidden: number } {
  const items = entities.filter(
    (e) => !isConcealed(e as SpoilerFields, context),
  );
  return { items, hidden: entities.length - items.length };
}
