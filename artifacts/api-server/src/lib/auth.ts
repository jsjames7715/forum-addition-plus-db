import { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";

const SESSION_COOKIE = "forum_sid";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(res: Response, userId: number): Promise<void> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessionsTable).values({ id, userId, expiresAt });

  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
  });
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sid));
  }
  res.clearCookie(SESSION_COOKIE);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (!sid) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, sid),
        gt(sessionsTable.expiresAt, new Date())
      )
    );

  if (!session) {
    res.clearCookie(SESSION_COOKIE);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    res.clearCookie(SESSION_COOKIE);
    res.status(401).json({ error: "User not found" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function getCurrentUser(req: Request): Promise<typeof usersTable.$inferSelect | null> {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (!sid) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, sid),
        gt(sessionsTable.expiresAt, new Date())
      )
    );

  if (!session) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ?? null;
}
