import { Router } from "express";

import { physicalArchiveController } from "../controllers/physical-archive-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { validateBody } from "../middlewares/validate-body";
import { createPhysicalArchiveSchema } from "../validators";

export const physicalArchiveRouter = Router();

physicalArchiveRouter.use(authenticate, requireAuth);
physicalArchiveRouter.get("/", asyncHandler(physicalArchiveController.list));
physicalArchiveRouter.post("/", validateBody(createPhysicalArchiveSchema), asyncHandler(physicalArchiveController.create));
