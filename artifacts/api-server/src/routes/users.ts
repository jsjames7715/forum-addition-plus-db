import { Router, type IRouter } from "express";
import { db, usersTable, postsTable, threadsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  GetUserProfileParams,
  UpdateMyProfileBody,
  UploadAvatarBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Must come before /users/:username to avoid conflict
router.patch("/users/me/profile", requireAuth, async (req, res): Promise<void> => {
  const body = UpdateMyProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const user = (req as any).user;
  const { displayName, bio } = body.data;

  const updates: Record<string, string | null> = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (bio !== undefined) updates.bio = bio;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(postsTable)
    .where(eq(postsTable.authorId, updated.id));

  const [{ threadCount }] = await db
    .select({ threadCount: count() })
    .from(threadsTable)
    .where(eq(threadsTable.authorId, updated.id));

  res.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName ?? null,
    bio: updated.bio ?? null,
    avatarUrl: updated.avatarUrl ?? null,
    postCount: Number(postCount),
    threadCount: Number(threadCount),
    createdAt: updated.createdAt,
  });
});

router.post("/users/me/avatar", requireAuth, async (req, res): Promise<void> => {
  const body = UploadAvatarBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { imageData } = body.data;

  // Validate it's a data URI
  if (!imageData.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data. Must be a base64 data URI." });
    return;
  }

  // Limit size to ~2MB in base64 (~1.5MB actual)
  if (imageData.length > 2_097_152) {
    res.status(400).json({ error: "Image too large. Maximum size is 1.5MB." });
    return;
  }

  const user = (req as any).user;

  await db
    .update(usersTable)
    .set({ avatarUrl: imageData })
    .where(eq(usersTable.id, user.id));

  res.json({ avatarUrl: imageData });
});

router.get("/users/:username", async (req, res): Promise<void> => {
  const params = GetUserProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { username } = params.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(postsTable)
    .where(eq(postsTable.authorId, user.id));

  const [{ threadCount }] = await db
    .select({ threadCount: count() })
    .from(threadsTable)
    .where(eq(threadsTable.authorId, user.id));

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    postCount: Number(postCount),
    threadCount: Number(threadCount),
    createdAt: user.createdAt,
  });
});

export default router;
