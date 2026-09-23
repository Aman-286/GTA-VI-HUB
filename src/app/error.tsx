"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Compass } from "lucide-react";
/**
 * Every page here renders from the database, so a failure is almost always a
 * failed fetch rather than a bad render. `reset()` only re-renders the
 * boundary's children with the data it already has, which re-ran straight back
 * into the same error -- the button looked like recovery and did nothing.
 * `retry()` re-fetches, so it can genuinely succeed.
 *
 * The digest is surfaced because it is the only handle a visitor can quote
 * when reporting a server error whose detail is deliberately not shown.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Page failed to render", error);
  }, [error]);
  return (
    <div className="container page-content">
      <div className="empty-state">
        <Compass size={32} />
        <h2>We lost the trail.</h2>
        <div className="muted">
          <p>
            This page couldn’t load. It is usually temporary — trying again will
            re-fetch it.
          </p>
          {error.digest && (
            <p className="error-digest">
              Reference <code>{error.digest}</code>
            </p>
          )}
        </div>
        <div className="empty-state-actions">
          <button className="button primary" onClick={() => retry()}>
            Try again
          </button>
          <Link className="button" href="/">
            Back to the hub
          </Link>
        </div>
      </div>
    </div>
  );
}
