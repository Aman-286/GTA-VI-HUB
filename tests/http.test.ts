import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ SITE_URL: "https://hub.example" }));
vi.mock("@/lib/db", () => ({ environment: async () => env, db: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { readJson, sameOrigin } from "@/lib/http";

beforeEach(() => {
  env.SITE_URL = "https://hub.example";
});

describe("mutation origin boundary", () => {
  it("accepts the configured origin", async () => {
    await expect(
      sameOrigin(
        new Request("https://internal.example/api", {
          headers: { Origin: "https://hub.example" },
        }),
      ),
    ).resolves.toBeUndefined();
  });
  it("does not trust a matching attacker-controlled URL or Host", async () => {
    await expect(
      sameOrigin(
        new Request("https://evil.example/api", {
          headers: { Origin: "https://evil.example", Host: "evil.example" },
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("rejects absent and null origins", async () => {
    for (const headers of [new Headers(), new Headers({ Origin: "null" })]) {
      await expect(
        sameOrigin(new Request("https://hub.example/api", { headers })),
      ).rejects.toMatchObject({ status: 403 });
    }
  });
  it("accepts another local development port, but not a public hostname", async () => {
    env.SITE_URL = "http://localhost:3000";
    await expect(
      sameOrigin(
        new Request("http://localhost:3210/api", {
          headers: { Origin: "http://localhost:3210" },
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      sameOrigin(
        new Request("http://evil.example/api", {
          headers: { Origin: "http://evil.example" },
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("bounded JSON request reading", () => {
  it("reads valid UTF-8 JSON without content length", async () => {
    await expect(
      readJson(
        new Request("https://hub.example", {
          method: "POST",
          body: '{"text":"é"}',
        }),
        20,
      ),
    ).resolves.toEqual({ text: "é" });
  });
  it("enforces a byte limit rather than a character count", async () => {
    await expect(
      readJson(
        new Request("https://hub.example", { method: "POST", body: '"éééé"' }),
        8,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("rejects invalid JSON", async () => {
    await expect(
      readJson(
        new Request("https://hub.example", { method: "POST", body: "invalid" }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
