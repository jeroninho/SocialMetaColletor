import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import youtubeRouter from "./youtube";
import instagramRouter from "./instagram";
import facebookRouter from "./facebook";
import dashboardRouter from "./dashboard";
import fetchMetadataRouter from "./fetch-metadata";
import webhooksRouter from "./webhooks";
import { optionalAuth } from "../middleware/auth.js";

const router: IRouter = Router();

router.use(healthRouter);

router.use(webhooksRouter);

router.use(optionalAuth);

router.use(authRouter);
router.use(usersRouter);

router.use(youtubeRouter);
router.use(instagramRouter);
router.use(facebookRouter);
router.use(dashboardRouter);
router.use(fetchMetadataRouter);

export { optionalAuth };
export default router;
