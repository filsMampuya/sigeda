import "./config/load-env";

import path from "node:path";
import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use("/local-storage", express.static(path.resolve(process.cwd(), "data", "documents")));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "sigeda-api" });
  });

  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
