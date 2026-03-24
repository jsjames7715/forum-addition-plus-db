import { Router, type IRouter } from "express";
import { db, postsTable, threadsTable, usersTable } from "@workspace/db";
import { eq, count, asc } from "drizzle-orm";
import {
  ListPostsParams,
  ListPostsQueryParams,
  CreatePostParams,
  CreatePostBody,
  ListPostsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/threads/:threadId/posts", async (req, res): Promise<void> => {
  const params = ListPostsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { threadId } = params.data;
  const { page, limit } = query.data;

  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const offset = (page - 1) * limit;

  const posts = await db
    .select({
      id: postsTable.id,
      threadId: postsTable.threadId,
      authorId: postsTable.authorId,
      authorUsername: usersTable.username,
      content: postsTable.content,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(eq(postsTable.threadId, threadId))
    .orderBy(asc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(postsTable)
    .where(eq(postsTable.threadId, threadId));

  res.json(ListPostsResponse.parse({ posts, total: Number(total), page, limit }));
});

router.post("/threads/:threadId/posts", requireAuth, async (req, res): Promise<void> => {
  const params = CreatePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreatePostBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { threadId } = params.data;
  const { content } = body.data;
  const user = (req as any).user;

  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const [post] = await db
    .insert(postsTable)
    .values({ threadId, authorId: user.id, content })
    .returning();

  await db
    .update(threadsTable)
    .set({ lastPostAt: post.createdAt })
    .where(eq(threadsTable.id, threadId));

  res.status(201).json({
    id: post.id,
    threadId: post.threadId,
    authorId: post.authorId,
    authorUsername: user.username,
    content: post.content,
    createdAt: post.createdAt,
  });
});

export default router;
