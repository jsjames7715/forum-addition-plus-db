import { Router, type IRouter } from "express";
import { db, postsTable, threadsTable, usersTable } from "@workspace/db";
import { eq, count, asc, isNull } from "drizzle-orm";
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

  const authorAlias = usersTable;

  const posts = await db
    .select({
      id: postsTable.id,
      threadId: postsTable.threadId,
      authorId: postsTable.authorId,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
      authorAvatarUrl: usersTable.avatarUrl,
      content: postsTable.content,
      parentPostId: postsTable.parentPostId,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(eq(postsTable.threadId, threadId))
    .orderBy(asc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich posts with parent post data
  const enrichedPosts = await Promise.all(
    posts.map(async (post) => {
      if (!post.parentPostId) {
        return {
          ...post,
          parentPostAuthorUsername: null,
          parentPostContent: null,
        };
      }

      const [parent] = await db
        .select({
          content: postsTable.content,
          authorUsername: usersTable.username,
        })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .where(eq(postsTable.id, post.parentPostId));

      return {
        ...post,
        parentPostAuthorUsername: parent?.authorUsername ?? null,
        parentPostContent: parent?.content ?? null,
      };
    })
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(postsTable)
    .where(eq(postsTable.threadId, threadId));

  res.json(ListPostsResponse.parse({ posts: enrichedPosts, total: Number(total), page, limit }));
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
  const { content, parentPostId } = body.data;
  const user = (req as any).user;

  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  // Validate parentPostId belongs to this thread
  if (parentPostId) {
    const [parentPost] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, parentPostId));
    if (!parentPost || parentPost.threadId !== threadId) {
      res.status(400).json({ error: "Invalid parent post" });
      return;
    }
  }

  const [post] = await db
    .insert(postsTable)
    .values({ threadId, authorId: user.id, content, parentPostId: parentPostId ?? null })
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
    authorDisplayName: user.displayName ?? null,
    authorAvatarUrl: user.avatarUrl ?? null,
    content: post.content,
    parentPostId: post.parentPostId ?? null,
    parentPostAuthorUsername: null,
    parentPostContent: null,
    createdAt: post.createdAt,
  });
});

export default router;
