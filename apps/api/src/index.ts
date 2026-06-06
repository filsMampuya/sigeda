import path from "node:path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { apiRouter } from "./routes";

dotenv.config();

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

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`SIGEDA API listening on port ${port}`);
});
