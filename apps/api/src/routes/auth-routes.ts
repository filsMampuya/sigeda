import { Router } from "express";

import { authController } from "../controllers/auth-controller";
import { asyncHandler } from "../middlewares/async-handler";
import { authenticate } from "../middlewares/authenticate";

export const authRouter = Router();

authRouter.get("/me", authenticate, asyncHandler(authController.me));
