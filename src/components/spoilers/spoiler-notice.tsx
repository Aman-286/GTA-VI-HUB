"use client";
import { EyeOff } from "lucide-react";
import { openSpoilerSettings } from "./spoiler-settings";

/**
 * Says out loud that the page is not showing everything.
 *
 * Silently shortening a list is the failure mode of most spoiler filters: the
 * reader cannot tell a hidden record from a database that simply has nothing,
 * so they stop trusting the results. Naming the number, and putting the
 * setting one click away, keeps the omission honest.
 *
 * `omitted` distinguishes the two cases -- search drops its hits entirely,
 * listings keep a masked row the reader can still open.
 */
export function SpoilerNotice({
  hidden,
  noun,
  omitted = false,
}: {
  hidden: number;
  noun: string;
  omitted?: boolean;
}) {
  if (hidden < 1) return null;
  const one = hidden === 1;
  return (
    <p className="notice spoiler-notice" role="status">
      <EyeOff size={15} aria-hidden="true" />
      <span>
        {hidden} {one ? noun : `${noun}s`}{" "}
        {omitted
          ? `${one ? "was" : "were"} left out to match your spoiler setting.`
          : `on this page ${one ? "is" : "are"} hidden to match your spoiler setting.`}
      </span>
      <button type="button" className="text-link" onClick={openSpoilerSettings}>
        Change what you see
      </button>
    </p>
  );
}
