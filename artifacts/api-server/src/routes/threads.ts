import { Router, type IRouter } from "express";
import { db, threadsTable, postsTable, categoriesTable, usersTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import {
  ListThreadsParams,
  ListThreadsQueryParams,
  CreateThreadParams,
  CreateThreadBody,
  GetThreadParams,
  ListThreadsResponse,
  GetThreadResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/categories/:categoryId/threads", async (req, res): Promise<void> => {
  const params = ListThreadsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListThreadsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { categoryId } = params.data;
  const { page, limit } = query.data;

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const offset = (page - 1) * limit;

  const threads = await db
    .select({
      id: threadsTable.id,
      title: threadsTable.title,
      categoryId: threadsTable.categoryId,
      authorId: threadsTable.authorId,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
      authorAvatarUrl: usersTable.avatarUrl,
      lastPostAt: threadsTable.lastPostAt,
      createdAt: threadsTable.createdAt,
    })
    .from(threadsTable)
    .innerJoin(usersTable, eq(threadsTable.authorId, usersTable.id))
    .where(eq(threadsTable.categoryId, categoryId))
    .orderBy(desc(threadsTable.lastPostAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(threadsTable)
    .where(eq(threadsTable.categoryId, categoryId));

  const threadsWithCount = await Promise.all(
    threads.map(async (t) => {
      const [{ postCount }] = await db
        .select({ postCount: count() })
        .from(postsTable)
        .where(eq(postsTable.threadId, t.id));
      return {
        ...t,
        authorDisplayName: t.authorDisplayName ?? null,
        authorAvatarUrl: t.authorAvatarUrl ?? null,
        postCount: Number(postCount),
      };
    })
  );

  res.json(ListThreadsResponse.parse({ threads: threadsWithCount, total: Number(total), page, limit }));
});

router.post("/categories/:categoryId/threads", requireAuth, async (req, res): Promise<void> => {
  const params = CreateThreadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateThreadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { categoryId } = params.data;
  const { title, content } = body.data;
  const user = (req as any).user;

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, categoryId));
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const [thread] = await db
    .insert(threadsTable)
    .values({ title, categoryId, authorId: user.id })
    .returning();

  await db.insert(postsTable).values({ threadId: thread.id, authorId: user.id, content });

  res.status(201).json(
    GetThreadResponse.parse({
      id: thread.id,
      title: thread.title,
      categoryId: thread.categoryId,
      authorId: thread.authorId,
      authorUsername: user.username,
      authorDisplayName: user.displayName ?? null,
      authorAvatarUrl: user.avatarUrl ?? null,
      postCount: 1,
      createdAt: thread.createdAt,
      lastPostAt: thread.lastPostAt,
    })
  );
});

router.get("/threads/:threadId", async (req, res): Promise<void> => {
  const params = GetThreadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { threadId } = params.data;

  const [row] = await db
    .select({
      id: threadsTable.id,
      title: threadsTable.title,
      categoryId: threadsTable.categoryId,
      authorId: threadsTable.authorId,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
      authorAvatarUrl: usersTable.avatarUrl,
      lastPostAt: threadsTable.lastPostAt,
      createdAt: threadsTable.createdAt,
    })
    .from(threadsTable)
    .innerJoin(usersTable, eq(threadsTable.authorId, usersTable.id))
    .where(eq(threadsTable.id, threadId));

  if (!row) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(postsTable)
    .where(eq(postsTable.threadId, threadId));

  res.json(
    GetThreadResponse.parse({
      ...row,
      authorDisplayName: row.authorDisplayName ?? null,
      authorAvatarUrl: row.authorAvatarUrl ?? null,
      postCount: Number(postCount),
    })
  );
});

export default router;
