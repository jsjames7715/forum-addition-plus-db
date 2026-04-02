import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, count } from "drizzle-orm";
import * as schema from "@workspace/db";
import { GetUserProfileParams, UpdateMyProfileBody, UploadAvatarBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { HonoEnv } from "../types";

const users = new Hono<HonoEnv>();

users.patch("/me/profile", requireAuth, async (c) => {
  const body = UpdateMyProfileBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.message }, 400);

  const user = c.get("user");
  const db = drizzle(c.env.DB, { schema });
  const updates: Record<string, string | null> = {};
  if (body.data.displayName !== undefined) updates.displayName = body.data.displayName;
  if (body.data.bio !== undefined) updates.bio = body.data.bio;

  const [updated] = await db
    .update(schema.usersTable)
    .set(updates)
    .where(eq(schema.usersTable.id, user.id))
    .returning();

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(schema.postsTable)
    .where(eq(schema.postsTable.authorId, updated.id));

  const [{ threadCount }] = await db
    .select({ threadCount: count() })
    .from(schema.threadsTable)
    .where(eq(schema.threadsTable.authorId, updated.id));

  return c.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName ?? null,
    bio: updated.bio ?? null,
    avatarUrl: updated.avatarUrl ?? null,
    postCount,
    threadCount,
    createdAt: updated.createdAt,
  });
});

users.post("/me/avatar", requireAuth, async (c) => {
  const body = UploadAvatarBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.message }, 400);

  const { imageData } = body.data;
  if (!imageData.startsWith("data:image/")) {
    return c.json({ error: "Invalid image data. Must be a base64 data URI." }, 400);
  }
  if (imageData.length > 2_097_152) {
    return c.json({ error: "Image too large. Maximum size is 1.5MB." }, 400);
  }

  const user = c.get("user");
  const db = drizzle(c.env.DB, { schema });

  await db
    .update(schema.usersTable)
    .set({ avatarUrl: imageData })
    .where(eq(schema.usersTable.id, user.id));

  return c.json({ avatarUrl: imageData });
});

users.get("/:username", async (c) => {
  const params = GetUserProfileParams.safeParse({ username: c.req.param("username") });
  if (!params.success) return c.json({ error: params.error.message }, 400);

  const { username } = params.data;
  const db = drizzle(c.env.DB, { schema });

  const [user] = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.username, username));

  if (!user) return c.json({ error: "User not found" }, 404);

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(schema.postsTable)
    .where(eq(schema.postsTable.authorId, user.id));

  const [{ threadCount }] = await db
    .select({ threadCount: count() })
    .from(schema.threadsTable)
    .where(eq(schema.threadsTable.authorId, user.id));

  return c.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    postCount,
    threadCount,
    createdAt: user.createdAt,
  });
});

export default users;
