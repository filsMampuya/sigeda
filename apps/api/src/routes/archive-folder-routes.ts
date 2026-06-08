import { Router } from "express";

import { archiveFolderController } from "../controllers/archive-folder-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { requireRole } from "../middlewares/require-role";
import { validateBody } from "../middlewares/validate-body";
import { createArchiveFolderSchema, updateArchiveFolderStatusSchema } from "../validators";

export const archiveFolderRouter = Router();

archiveFolderRouter.use(authenticate, requireAuth);
archiveFolderRouter.get("/", asyncHandler(archiveFolderController.list));
archiveFolderRouter.post(
  "/",
  requireRole(["ADMIN", "ARCHIVISTE", "DIRECTEUR", "CHEF_SERVICE", "CHEF_BUREAU"]),
  validateBody(createArchiveFolderSchema),
  asyncHandler(archiveFolderController.create)
);
archiveFolderRouter.post(
  "/:id/status",
  requireRole(["ADMIN", "ARCHIVISTE", "DIRECTEUR", "CHEF_SERVICE", "CHEF_BUREAU"]),
  validateBody(updateArchiveFolderStatusSchema),
  asyncHandler(archiveFolderController.updateStatus)
);
