import { getCloudflareContext } from "@opennextjs/cloudflare";
export interface Statement {
  bind(...args: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch<T = unknown>(queries: Statement[]): Promise<T[]>;
}
export interface Env {
  DB: Database;
  SITE_URL: string;
  TURNSTILE_SECRET_KEY?: string;
  DEMO_MODE?: string;
}
export async function environment(): Promise<Env> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as Env;
}
export async function db() {
  return (await environment()).DB;
}
export async function rows<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  return (
    await (
      await db()
    )
      .prepare(sql)
      .bind(...args)
      .all<T>()
  ).results;
}
export async function first<T>(
  sql: string,
  ...args: unknown[]
): Promise<T | null> {
  return (await db())
    .prepare(sql)
    .bind(...args)
    .first<T>();
}
