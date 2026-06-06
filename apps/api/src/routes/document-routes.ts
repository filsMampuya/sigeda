import { Router } from "express";

import { documentController } from "../controllers/document-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { uploadFile } from "../middlewares/upload-file";
import { validateBody } from "../middlewares/validate-body";
import { createDocumentSchema } from "../validators";

export const documentRouter = Router();

documentRouter.use(authenticate, requireAuth);
documentRouter.get("/", asyncHandler(documentController.list));
documentRouter.get("/search", asyncHandler(documentController.search));
documentRouter.get("/:id", asyncHandler(documentController.getById));
documentRouter.post("/", validateBody(createDocumentSchema), asyncHandler(documentController.create));
documentRouter.post("/:id/upload", uploadFile.single("file"), asyncHandler(documentController.upload));
documentRouter.put("/:id", asyncHandler(documentController.update));
documentRouter.delete("/:id", asyncHandler(documentController.remove));
documentRouter.post("/:id/archive", asyncHandler(documentController.archive));
documentRouter.post("/:id/validate", asyncHandler(documentController.validate));
documentRouter.post("/:id/reject", asyncHandler(documentController.reject));
