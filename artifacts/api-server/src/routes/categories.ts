import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, count } from "drizzle-orm";
import * as schema from "@workspace/db";
import type { HonoEnv } from "../types";

const categories = new Hono<HonoEnv>();

categories.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  const cats = await db.select().from(schema.categoriesTable);

  const enriched = await Promise.all(
    cats.map(async (cat) => {
      const threads = await db
        .select()
        .from(schema.threadsTable)
        .where(eq(schema.threadsTable.categoryId, cat.id));

      const threadIds = threads.map((t) => t.id);
      let postCount = 0;
      for (const tid of threadIds) {
        const [{ total }] = await db
          .select({ total: count() })
          .from(schema.postsTable)
          .where(eq(schema.postsTable.threadId, tid));
        postCount += total;
      }

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        threadCount: threads.length,
        postCount,
      };
    })
  );

  return c.json({ categories: enriched });
});

export default categories;
