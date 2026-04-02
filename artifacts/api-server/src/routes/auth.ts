import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentUser,
} from "../lib/auth";
import type { HonoEnv } from "../types";

const auth = new Hono<HonoEnv>();

function formatAuthUser(user: typeof schema.usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
  };
}

auth.post("/register", async (c) => {
  const parsed = RegisterBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const { username, password } = parsed.data;
  const db = drizzle(c.env.DB, { schema });

  const [existing] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.username, username));

  if (existing) return c.json({ error: "Username already taken" }, 409);

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(schema.usersTable)
    .values({ username, passwordHash })
    .returning();

  await createSession(c, user.id);
  return c.json(formatAuthUser(user), 201);
});

auth.post("/login", async (c) => {
  const parsed = LoginBody.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const { username, password } = parsed.data;
  const db = drizzle(c.env.DB, { schema });

  const [user] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.username, username));

  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  await createSession(c, user.id);
  return c.json(formatAuthUser(user));
});

auth.post("/logout", async (c) => {
  await destroySession(c);
  return c.body(null, 204);
});

auth.get("/me", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: "Not authenticated" }, 401);
  return c.json(formatAuthUser(user));
});

export default auth;
