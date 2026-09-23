import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  first: vi.fn(),
  rows: vi.fn(),
  cookies: vi.fn(),
  set: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  ...mocks,
  environment: async () => ({ SITE_URL: "https://hub.example" }),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
import { requireAdmin, setSession } from "@/lib/auth/session";
let d: DatabaseSync;
beforeEach(() => {
  vi.clearAllMocks();
  d = new DatabaseSync(":memory:");
  d.exec(
    "CREATE TABLE credentials(user_id TEXT PRIMARY KEY,password_hash TEXT); CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT,expires_at INTEGER); INSERT INTO credentials VALUES('account','current-hash');",
  );
  mocks.db.mockResolvedValue({
    prepare: (sql: string) => ({
      bind: (...args: (string | number)[]) => ({
        first: async () => d.prepare(sql).get(...args) ?? null,
        run: async () => d.prepare(sql).run(...args),
      }),
    }),
  });
  mocks.cookies.mockResolvedValue({
    get: () => ({ value: "session" }),
    set: mocks.set,
  });
});
afterEach(() => d.close());
describe("account session and role boundaries", () => {
  it("refuses session issuance from credentials replaced during a login", async () => {
    await expect(setSession("account", "old-hash")).rejects.toMatchObject({
      status: 409,
    });
    expect(d.prepare("SELECT * FROM sessions").all()).toHaveLength(0);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("issues a secure session only for the current credential hash", async () => {
    await setSession("account", "current-hash");
    expect(d.prepare("SELECT * FROM sessions").all()).toHaveLength(1);
    expect(mocks.set).toHaveBeenCalledWith(
      "hub_session",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }),
    );
  });
  it("accepts an email administrator", async () => {
    mocks.first.mockResolvedValue({
      id: "account",
      email: "test@example.com",
      github_id: null,
    });
    mocks.rows.mockResolvedValue([{ role: "admin" }]);
    await expect(requireAdmin()).resolves.toMatchObject({ id: "account" });
  });
  it("refuses an administrator role on an unregistered guest", async () => {
    mocks.first.mockResolvedValue({
      id: "guest",
      email: null,
      github_id: null,
    });
    mocks.rows.mockResolvedValue([{ role: "admin" }]);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });
  it("refuses a signed-in editor at the admin boundary", async () => {
    mocks.first.mockResolvedValue({
      id: "account",
      email: "test@example.com",
      github_id: null,
    });
    mocks.rows.mockResolvedValue([{ role: "editor" }]);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });
});
