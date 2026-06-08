import { Router } from "express";

import { documentArchiveController } from "../controllers/document-archive-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";

export const documentArchiveRouter = Router();

documentArchiveRouter.use(authenticate, requireAuth);
documentArchiveRouter.get("/", asyncHandler(documentArchiveController.list));
