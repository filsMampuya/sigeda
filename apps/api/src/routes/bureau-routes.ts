import { Router } from "express";

import { bureauController } from "../controllers/bureau-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { validateBody } from "../middlewares/validate-body";
import { createBureauSchema } from "../validators";

export const bureauRouter = Router();

bureauRouter.use(authenticate, requireAuth);
bureauRouter.get("/", asyncHandler(bureauController.list));
bureauRouter.post("/", validateBody(createBureauSchema), asyncHandler(bureauController.create));
