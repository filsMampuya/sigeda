import { Router } from "express";

import { auditLogRouter } from "./audit-log-routes";
import { archiveFolderRouter } from "./archive-folder-routes";
import { authRouter } from "./auth-routes";
import { bureauRouter } from "./bureau-routes";
import { dashboardRouter } from "./dashboard-routes";
import { departementRouter } from "./departement-routes";
import { directionRouter } from "./direction-routes";
import { documentArchiveRouter } from "./document-archive-routes";
import { documentRouter } from "./document-routes";
import { physicalArchiveRouter } from "./physical-archive-routes";
import { serviceRouter } from "./service-routes";
import { userRouter } from "./user-routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/archive-folders", archiveFolderRouter);
apiRouter.use("/departements", departementRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/documents", documentRouter);
apiRouter.use("/document-archives", documentArchiveRouter);
apiRouter.use("/directions", directionRouter);
apiRouter.use("/services", serviceRouter);
apiRouter.use("/bureaux", bureauRouter);
apiRouter.use("/audit-logs", auditLogRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/physical-archives", physicalArchiveRouter);
