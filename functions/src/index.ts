import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

import { app } from "../../apps/api/src/app";

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1"
});

export const server = onRequest(
  {
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 540
  },
  app
);
