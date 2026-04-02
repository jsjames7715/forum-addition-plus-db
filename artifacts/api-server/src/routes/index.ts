import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import threadsRouter from "./threads";
import postsRouter from "./posts";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(threadsRouter);
router.use(postsRouter);
router.use(usersRouter);

export default router;
