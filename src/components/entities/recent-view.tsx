"use client";
import { useEffect } from "react";
export function RecentView({ id }: { id: string }) {
  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.user)
          void fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity_id: id, type: "view", value: true }),
          });
      })
      .catch(() => {});
  }, [id]);
  return null;
}
