import { Router } from "express";

import { departementController } from "../controllers/departement-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { validateBody } from "../middlewares/validate-body";
import { createDepartementSchema } from "../validators";

export const departementRouter = Router();

departementRouter.use(authenticate, requireAuth);
departementRouter.get("/", asyncHandler(departementController.list));
departementRouter.get("/hierarchy", asyncHandler(departementController.hierarchy));
departementRouter.get("/:code", asyncHandler(departementController.getByCode));
departementRouter.post("/", validateBody(createDepartementSchema), asyncHandler(departementController.create));

