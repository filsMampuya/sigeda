import { Router } from "express";

import { userController } from "../controllers/user-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";
import { requireAuth } from "../middlewares/require-auth";
import { validateBody } from "../middlewares/validate-body";
import { createUserSchema } from "../validators";

export const userRouter = Router();

userRouter.use(authenticate, requireAuth);
userRouter.get("/", asyncHandler(userController.list));
userRouter.get("/:matricule", asyncHandler(userController.getByMatricule));
userRouter.post("/", validateBody(createUserSchema), asyncHandler(userController.create));
