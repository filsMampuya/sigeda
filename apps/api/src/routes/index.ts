import { Router } from "express";

import { auditLogRouter } from "./audit-log-routes";
import { authRouter } from "./auth-routes";
import { bureauRouter } from "./bureau-routes";
import { dashboardRouter } from "./dashboard-routes";
import { directionRouter } from "./direction-routes";
import { documentRouter } from "./document-routes";
import { serviceRouter } from "./service-routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/documents", documentRouter);
apiRouter.use("/directions", directionRouter);
apiRouter.use("/services", serviceRouter);
apiRouter.use("/bureaux", bureauRouter);
apiRouter.use("/audit-logs", auditLogRouter);
apiRouter.use("/dashboard", dashboardRouter);
