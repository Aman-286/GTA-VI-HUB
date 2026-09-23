"use client";
import { useEffect } from "react";
/**
 * Last resort: this replaces the root layout, so it cannot rely on the header,
 * the footer or globals.css being applied. An error thrown while rendering the
 * layout itself previously fell through to the framework's unstyled default,
 * which is the one screen on the site that looked broken rather than designed.
 * Styles are inline for that reason.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Application failed to render", error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeContent: "center",
          textAlign: "center",
          padding: "24px",
          gap: "20px",
          background: "#15152d",
          color: "#faf4ff",
          fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.9rem", letterSpacing: "-0.03em" }}>
          The hub is off the air.
        </h1>
        <p style={{ margin: 0, color: "#c6bbd9", lineHeight: 1.7 }}>
          Something went wrong loading the site. Please try again in a moment.
        </p>
        <div>
          <button
            onClick={() => retry()}
            style={{
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
              border: 0,
              borderRadius: "6px",
              padding: "13px 22px",
              color: "#15152d",
              background: "linear-gradient(110deg, #ff3d9a, #ff7849)",
            }}
          >
            Try again
          </button>
        </div>
        {error.digest && (
          <small style={{ color: "#a99bbc" }}>Reference {error.digest}</small>
        )}
      </body>
    </html>
  );
}
