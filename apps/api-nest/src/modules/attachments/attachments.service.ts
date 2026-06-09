import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AttachmentsService {
  computeChecksum(buffer: Buffer) {
    return createHash("sha256").update(buffer).digest("hex");
  }

  storagePlan() {
    return {
      provider: "MINIO",
      bucket: process.env.MINIO_BUCKET ?? "sigeda-documents",
      endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
      status: "planned"
    };
  }
}
