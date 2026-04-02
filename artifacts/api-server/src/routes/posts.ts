import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, count, asc } from "drizzle-orm";
import * as schema from "@workspace/db";
import {
  ListPostsParams,
  ListPostsQueryParams,
  CreatePostParams,
  CreatePostBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { HonoEnv } from "../types";

const posts = new Hono<HonoEnv>();

posts.get("/threads/:threadId/posts", async (c) => {
  const params = ListPostsParams.safeParse({ threadId: c.req.param("threadId") });
  if (!params.success) return c.json({ error: params.error.message }, 400);

  const query = ListPostsQueryParams.safeParse({
    page: c.req.query("page") ?? "1",
    limit: c.req.query("limit") ?? "20",
  });
  if (!query.success) return c.json({ error: query.error.message }, 400);

  const { threadId } = params.data;
  const { page, limit } = query.data;
  const db = drizzle(c.env.DB, { schema });

  const [thread] = await db
    .select()
    .from(schema.threadsTable)
    .where(eq(schema.threadsTable.id, threadId));
  if (!thread) return c.json({ error: "Thread not found" }, 404);

  const offset = (page - 1) * limit;

  const postRows = await db
    .select({
      id: schema.postsTable.id,
      threadId: schema.postsTable.threadId,
      authorId: schema.postsTable.authorId,
      authorUsername: schema.usersTable.username,
      authorDisplayName: schema.usersTable.displayName,
      authorAvatarUrl: schema.usersTable.avatarUrl,
      content: schema.postsTable.content,
      parentPostId: schema.postsTable.parentPostId,
      createdAt: schema.postsTable.createdAt,
    })
    .from(schema.postsTable)
    .innerJoin(schema.usersTable, eq(schema.postsTable.authorId, schema.usersTable.id))
    .where(eq(schema.postsTable.threadId, threadId))
    .orderBy(asc(schema.postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(
    postRows.map(async (post) => {
      if (!post.parentPostId) {
        return {
          ...post,
          authorDisplayName: post.authorDisplayName ?? null,
          authorAvatarUrl: post.authorAvatarUrl ?? null,
          parentPostAuthorUsername: null,
          parentPostContent: null,
        };
      }

      const [parent] = await db
        .select({
          content: schema.postsTable.content,
          authorUsername: schema.usersTable.username,
        })
        .from(schema.postsTable)
        .innerJoin(schema.usersTable, eq(schema.postsTable.authorId, schema.usersTable.id))
        .where(eq(schema.postsTable.id, post.parentPostId));

      return {
        ...post,
        authorDisplayName: post.authorDisplayName ?? null,
        authorAvatarUrl: post.authorAvatarUrl ?? null,
        parentPostAuthorUsername: parent?.authorUsername ?? null,
        parentPostContent: parent?.content ?? null,
      };
    })
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(schema.postsTable)
    .where(eq(schema.postsTable.threadId, threadId));

  return c.json({ posts: enriched, total, page, limit });
});

posts.post("/threads/:threadId/posts", requireAuth, async (c) => {
  const params = CreatePostParams.safeParse({ threadId: c.req.param("threadId") });
  if (!params.success) return c.json({ error: params.error.message }, 400);

  const body = CreatePostBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.message }, 400);

  const { threadId } = params.data;
  const { content, parentPostId } = body.data;
  const user = c.get("user");
  const db = drizzle(c.env.DB, { schema });

  const [thread] = await db
    .select()
    .from(schema.threadsTable)
    .where(eq(schema.threadsTable.id, threadId));
  if (!thread) return c.json({ error: "Thread not found" }, 404);

  if (parentPostId) {
    const [parentPost] = await db
      .select()
      .from(schema.postsTable)
      .where(eq(schema.postsTable.id, parentPostId));
    if (!parentPost || parentPost.threadId !== threadId) {
      return c.json({ error: "Invalid parent post" }, 400);
    }
  }

  const now = new Date().toISOString();
  const [post] = await db
    .insert(schema.postsTable)
    .values({
      threadId,
      authorId: user.id,
      content,
      parentPostId: parentPostId ?? null,
      createdAt: now,
    })
    .returning();

  await db
    .update(schema.threadsTable)
    .set({ lastPostAt: post.createdAt })
    .where(eq(schema.threadsTable.id, threadId));

  return c.json(
    {
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
    },
    201
  );
});

export default posts;
