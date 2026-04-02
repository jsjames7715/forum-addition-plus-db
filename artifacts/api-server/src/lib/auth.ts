import { drizzle } from "drizzle-orm/d1";
import { eq, and, gt } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import * as schema from "@workspace/db";
import type { Context } from "hono";
import type { HonoEnv } from "../types";

const SESSION_COOKIE = "forum_sid";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    keyMaterial,
    256
  );
  const hashHex = [...new Uint8Array(bits)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const saltHex = [...salt]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pbkdf2:sha256:100000:${saltHex}:${hashHex}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 5) return false;
  const [, , , saltHex, hashHex] = parts;
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    keyMaterial,
    256
  );
  const newHashHex = [...new Uint8Array(bits)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return newHashHex === hashHex;
}

export async function createSession(
  c: Context<HonoEnv>,
  userId: number
): Promise<void> {
  const db = drizzle(c.env.DB, { schema });
  const id = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await db.insert(schema.sessionsTable).values({ id, userId, expiresAt });
  setCookie(c, SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "Lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function destroySession(c: Context<HonoEnv>): Promise<void> {
  const db = drizzle(c.env.DB, { schema });
  const sid = getCookie(c, SESSION_COOKIE);
  if (sid) {
    await db
      .delete(schema.sessionsTable)
      .where(eq(schema.sessionsTable.id, sid));
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function getCurrentUser(
  c: Context<HonoEnv>
): Promise<typeof schema.usersTable.$inferSelect | null> {
  const db = drizzle(c.env.DB, { schema });
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) return null;

  const now = new Date().toISOString();
  const [session] = await db
    .select()
    .from(schema.sessionsTable)
    .where(
      and(
        eq(schema.sessionsTable.id, sid),
        gt(schema.sessionsTable.expiresAt, now)
      )
    );

  if (!session) return null;

  const [user] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, session.userId));

  return user ?? null;
}

export const requireAuth = createMiddleware<HonoEnv>(async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const now = new Date().toISOString();
  const [session] = await db
    .select()
    .from(schema.sessionsTable)
    .where(
      and(
        eq(schema.sessionsTable.id, sid),
        gt(schema.sessionsTable.expiresAt, now)
      )
    );

  if (!session) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ error: "Session expired" }, 401);
  }

  const [user] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, session.userId));

  if (!user) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", user);
  await next();
});
