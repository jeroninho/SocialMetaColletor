import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import oauthRouter from "./oauth";
import usersRouter from "./users";
import youtubeRouter from "./youtube";
import instagramRouter from "./instagram";
import facebookRouter from "./facebook";
import tiktokRouter from "./tiktok";
import twitterRouter from "./twitter";
import dashboardRouter from "./dashboard";
import comparatorRouter from "./comparator";
import alertsRouter from "./alerts";
import schedulerRouter from "./scheduler";
import fetchMetadataRouter from "./fetch-metadata";
import webhooksRouter from "./webhooks";
import oauthCredentialsRouter from "./oauth-credentials";
import { optionalAuth } from "../middleware/auth.js";

const router: IRouter = Router();

router.use(healthRouter);

router.use(webhooksRouter);

router.use(oauthRouter);

router.use(optionalAuth);

router.use(authRouter);
router.use(usersRouter);

router.use(youtubeRouter);
router.use(instagramRouter);
router.use(facebookRouter);
router.use(tiktokRouter);
router.use(twitterRouter);
router.use(dashboardRouter);
router.use(comparatorRouter);
router.use(alertsRouter);
router.use(schedulerRouter);
router.use(fetchMetadataRouter);
router.use(oauthCredentialsRouter);

export { optionalAuth };
export default router;
