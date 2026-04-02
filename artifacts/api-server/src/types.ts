import type * as schema from "@workspace/db";

export type HonoEnv = {
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    user: typeof schema.usersTable.$inferSelect;
  };
};
