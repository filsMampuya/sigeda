import { Router } from "express";

import { directionController } from "../controllers/direction-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { validateBody } from "../middlewares/validate-body";
import { createDirectionSchema } from "../validators";

export const directionRouter = Router();

directionRouter.use(authenticate, requireAuth);
directionRouter.get("/", asyncHandler(directionController.list));
directionRouter.post("/", validateBody(createDirectionSchema), asyncHandler(directionController.create));
