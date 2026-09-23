/**
 * Spoiler policy. Pure functions only -- no database, no React, no request
 * context -- so the rules can be unit tested directly and so the same decision
 * is reached on the server (which decides what to send) and in the client
 * (which decides what a "reveal once" click restores).
 *
 * The important property is that concealment *removes* the sensitive fields
 * rather than covering them. A blurred title is still in the HTML, still read
 * aloud by a screen reader, still scraped into a link preview, and still in
 * the URL slug. Every function here produces a record that never contained the
 * hidden text in the first place.
 */
export const spoilerModes = ["none", "minor", "all"] as const;
export type SpoilerMode = (typeof spoilerModes)[number];

export const spoilerModeLabels: Record<SpoilerMode, string> = {
  none: "No spoilers",
  minor: "Minor gameplay spoilers",
  all: "Show everything",
};

export const spoilerModeDescriptions: Record<SpoilerMode, string> = {
  none: "Hide story content and gameplay details you have not reached yet.",
  minor:
    "Show unlocks, equipment and side content. Keep story developments hidden.",
  all: "Show every record with nothing held back.",
};

/** 0 safe · 1 minor gameplay detail · 2 story content. */
export type SpoilerLevel = 0 | 1 | 2;

export const spoilerLevelLabels: Record<SpoilerLevel, string> = {
  0: "No spoilers",
  1: "Minor gameplay spoiler",
  2: "Story spoiler",
};

export interface SpoilerContext {
  mode: SpoilerMode;
  /**
   * How far the reader has played, expressed as a mission sequence number.
   * Null when they have not told us, which is treated as "the very beginning"
   * -- the cautious reading, never the permissive one.
   */
  storySequence: number | null;
  /** Categories the reader has chosen to always see. */
  revealed: ReadonlySet<string>;
}

export const defaultSpoilerContext: SpoilerContext = {
  mode: "none",
  storySequence: null,
  revealed: new Set(),
};

/** The spoiler-relevant shape of a record. Anything wider also satisfies it. */
export interface SpoilerFields {
  spoiler_level?: number | null;
  spoiler_category?: string | null;
  reveal_after_sequence?: number | null;
}

export function normalizeMode(value: unknown): SpoilerMode {
  return spoilerModes.includes(value as SpoilerMode)
    ? (value as SpoilerMode)
    : "none";
}

export function normalizeLevel(value: unknown): SpoilerLevel {
  const n = Number(value);
  return n === 1 || n === 2 ? n : 0;
}

/**
 * The single decision every surface asks. Returns true when the record's real
 * title, description, body and imagery must not be sent to this reader.
 */
export function isConcealed(
  entity: SpoilerFields,
  context: SpoilerContext,
): boolean {
  const level = normalizeLevel(entity.spoiler_level);
  if (level === 0) return false;
  if (context.mode === "all") return false;
  if (level === 1 && context.mode === "minor") return false;

  // A reader who has already played past the point a record describes cannot
  // be spoiled by it. This is what makes "set your current mission" useful
  // rather than decorative.
  const threshold = entity.reveal_after_sequence;
  if (
    typeof threshold === "number" &&
    Number.isFinite(threshold) &&
    context.storySequence !== null &&
    context.storySequence >= threshold
  )
    return false;

  // An explicit per-category opt-in from the reader.
  const category = (entity.spoiler_category || "").trim();
  if (category && context.revealed.has(category)) return false;

  return true;
}

/**
 * Why a record is hidden, in words a reader can act on. Used as the label of
 * the reveal control so the control is meaningful without sighted context.
 */
export function concealmentReason(entity: SpoilerFields): string {
  const level = normalizeLevel(entity.spoiler_level);
  const category = (entity.spoiler_category || "").trim();
  const named: Record<string, string> = {
    story: "a story development",
    character: "a character detail",
    ending: "an ending",
    location: "a late-game location",
    mechanic: "a later unlock",
    "side-content": "optional content",
  };
  if (category && named[category])
    return `Hidden because it describes ${named[category]}.`;
  return level === 2
    ? "Hidden because it contains story content."
    : "Hidden because it contains a gameplay detail you may not have reached.";
}

/** The generic stand-in used when an editor has not written a safe title. */
export function placeholderTitle(entity: SpoilerFields): string {
  return normalizeLevel(entity.spoiler_level) === 2
    ? "Hidden story content"
    : "Hidden gameplay detail";
}
