import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import youtubeRouter from "./youtube";
import instagramRouter from "./instagram";
import facebookRouter from "./facebook";
import dashboardRouter from "./dashboard";
import fetchMetadataRouter from "./fetch-metadata";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(youtubeRouter);
router.use(instagramRouter);
router.use(facebookRouter);
router.use(dashboardRouter);
router.use(fetchMetadataRouter);

export default router;
