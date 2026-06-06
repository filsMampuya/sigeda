import { Router } from "express";

import { dashboardController } from "../controllers/dashboard-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireAuth);
dashboardRouter.get("/stats", asyncHandler(dashboardController.stats));
