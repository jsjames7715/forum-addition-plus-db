import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, count, desc } from "drizzle-orm";
import * as schema from "@workspace/db";
import {
  ListThreadsParams,
  ListThreadsQueryParams,
  CreateThreadParams,
  CreateThreadBody,
  GetThreadParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { HonoEnv } from "../types";

const threads = new Hono<HonoEnv>();

threads.get("/categories/:categoryId/threads", async (c) => {
  const params = ListThreadsParams.safeParse({ categoryId: c.req.param("categoryId") });
  if (!params.success) return c.json({ error: params.error.message }, 400);

  const query = ListThreadsQueryParams.safeParse({
    page: c.req.query("page") ?? "1",
    limit: c.req.query("limit") ?? "20",
  });
  if (!query.success) return c.json({ error: query.error.message }, 400);

  const { categoryId } = params.data;
  const { page, limit } = query.data;
  const db = drizzle(c.env.DB, { schema });

  const [cat] = await db
    .select()
    .from(schema.categoriesTable)
    .where(eq(schema.categoriesTable.id, categoryId));
  if (!cat) return c.json({ error: "Category not found" }, 404);

  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: schema.threadsTable.id,
      title: schema.threadsTable.title,
      categoryId: schema.threadsTable.categoryId,
      authorId: schema.threadsTable.authorId,
      authorUsername: schema.usersTable.username,
      authorDisplayName: schema.usersTable.displayName,
      authorAvatarUrl: schema.usersTable.avatarUrl,
      lastPostAt: schema.threadsTable.lastPostAt,
      createdAt: schema.threadsTable.createdAt,
    })
    .from(schema.threadsTable)
    .innerJoin(schema.usersTable, eq(schema.threadsTable.authorId, schema.usersTable.id))
    .where(eq(schema.threadsTable.categoryId, categoryId))
    .orderBy(desc(schema.threadsTable.lastPostAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(schema.threadsTable)
    .where(eq(schema.threadsTable.categoryId, categoryId));

  const threadList = await Promise.all(
    rows.map(async (t) => {
      const [{ postCount }] = await db
        .select({ postCount: count() })
        .from(schema.postsTable)
        .where(eq(schema.postsTable.threadId, t.id));
      return {
        ...t,
        authorDisplayName: t.authorDisplayName ?? null,
        authorAvatarUrl: t.authorAvatarUrl ?? null,
        postCount,
      };
    })
  );

  return c.json({ threads: threadList, total, page, limit });
});

threads.post("/categories/:categoryId/threads", requireAuth, async (c) => {
  const params = CreateThreadParams.safeParse({ categoryId: c.req.param("categoryId") });
  if (!params.success) return c.json({ error: params.error.message }, 400);

  const body = CreateThreadBody.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.message }, 400);

  const { categoryId } = params.data;
  const { title, content } = body.data;
  const user = c.get("user");
  const db = drizzle(c.env.DB, { schema });

  const [cat] = await db
    .select()
    .from(schema.categoriesTable)
    .where(eq(schema.categoriesTable.id, categoryId));
  if (!cat) return c.json({ error: "Category not found" }, 404);

  const [thread] = await db
    .insert(schema.threadsTable)
    .values({ title, categoryId, authorId: user.id })
    .returning();

  await db.insert(schema.postsTable).values({
    threadId: thread.id,
    authorId: user.id,
    content,
  });

  return c.json(
    {
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
    },
    201
  );
});

threads.get("/threads/:threadId", async (c) => {
  const params = GetThreadParams.safeParse({ threadId: c.req.param("threadId") });
  if (!params.success) return c.json({ error: params.error.message }, 400);

  const { threadId } = params.data;
  const db = drizzle(c.env.DB, { schema });

  const [row] = await db
    .select({
      id: schema.threadsTable.id,
      title: schema.threadsTable.title,
      categoryId: schema.threadsTable.categoryId,
      authorId: schema.threadsTable.authorId,
      authorUsername: schema.usersTable.username,
      authorDisplayName: schema.usersTable.displayName,
      authorAvatarUrl: schema.usersTable.avatarUrl,
      lastPostAt: schema.threadsTable.lastPostAt,
      createdAt: schema.threadsTable.createdAt,
    })
    .from(schema.threadsTable)
    .innerJoin(schema.usersTable, eq(schema.threadsTable.authorId, schema.usersTable.id))
    .where(eq(schema.threadsTable.id, threadId));

  if (!row) return c.json({ error: "Thread not found" }, 404);

  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(schema.postsTable)
    .where(eq(schema.postsTable.threadId, threadId));

  return c.json({
    ...row,
    authorDisplayName: row.authorDisplayName ?? null,
    authorAvatarUrl: row.authorAvatarUrl ?? null,
    postCount,
  });
});

export default threads;
