import { Router } from "express";

import { auditLogController } from "../controllers/audit-log-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";

export const auditLogRouter = Router();

auditLogRouter.use(authenticate, requireAuth);
auditLogRouter.get("/", asyncHandler(auditLogController.list));
