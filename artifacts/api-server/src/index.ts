import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./types";
import authRoutes from "./routes/auth";
import categoriesRoutes from "./routes/categories";
import threadsRoutes from "./routes/threads";
import postsRoutes from "./routes/posts";
import usersRoutes from "./routes/users";

const app = new Hono<HonoEnv>();

app.use(
  "*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  })
);

const api = new Hono<HonoEnv>();

api.get("/healthz", (c) => c.json({ status: "ok" }));

// /api/auth/*
api.route("/auth", authRoutes);

// /api/categories (list) and /api/categories/:categoryId/threads (in threadsRoutes)
api.route("/categories", categoriesRoutes);

// /api/categories/:categoryId/threads and /api/threads/:threadId
api.route("/", threadsRoutes);

// /api/threads/:threadId/posts
api.route("/", postsRoutes);

// /api/users/me/profile, /api/users/me/avatar, /api/users/:username
api.route("/users", usersRoutes);

app.route("/api", api);

export default app;
