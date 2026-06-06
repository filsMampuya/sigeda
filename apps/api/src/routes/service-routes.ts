import { Router } from "express";

import { serviceController } from "../controllers/service-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { validateBody } from "../middlewares/validate-body";
import { createServiceSchema } from "../validators";

export const serviceRouter = Router();

serviceRouter.use(authenticate, requireAuth);
serviceRouter.get("/", asyncHandler(serviceController.list));
serviceRouter.post("/", validateBody(createServiceSchema), asyncHandler(serviceController.create));
