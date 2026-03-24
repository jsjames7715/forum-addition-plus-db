import { Router, type IRouter } from "express";
import { db, categoriesTable, threadsTable, postsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { ListCategoriesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.id);

  const result = await Promise.all(
    cats.map(async (cat) => {
      const [threadRow] = await db
        .select({ count: count() })
        .from(threadsTable)
        .where(eq(threadsTable.categoryId, cat.id));

      const threads = await db
        .select({ id: threadsTable.id })
        .from(threadsTable)
        .where(eq(threadsTable.categoryId, cat.id));

      const threadIds = threads.map((t) => t.id);
      let postCount = 0;
      if (threadIds.length > 0) {
        const [postRow] = await db
          .select({ count: count() })
          .from(postsTable)
          .where(sql`${postsTable.threadId} = ANY(${sql.raw(`ARRAY[${threadIds.join(",")}]`)})`);
        postCount = Number(postRow?.count ?? 0);
      }

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        threadCount: Number(threadRow?.count ?? 0),
        postCount,
      };
    })
  );

  res.json(ListCategoriesResponse.parse({ categories: result }));
});

export default router;
