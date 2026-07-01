import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Client } from "minio";
import { buildDocumentIntelligenceObjectKey } from "./utils/temp-object-key.js";

@Injectable()
export class DocumentIntelligenceStorageService {
  private readonly client: Client;
  private bucketReady = false;

  constructor() {
    const endpoint = new URL(process.env.MINIO_ENDPOINT ?? "http://localhost:9000");
    this.client = new Client({
      endPoint: endpoint.hostname,
      port: Number.parseInt(endpoint.port || (endpoint.protocol === "https:" ? "443" : "80"), 10),
      useSSL: endpoint.protocol === "https:",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "sigeda",
      secretKey: process.env.MINIO_SECRET_KEY ?? "sigeda-password",
      region: process.env.MINIO_REGION ?? "us-east-1"
    });
  }

  async uploadTemporarySourceFile(input: {
    jobId: string;
    file: Express.Multer.File;
  }) {
    await this.ensureBucket();

    const bucket = process.env.MINIO_BUCKET ?? "sigeda-documents";
    const objectKey = buildDocumentIntelligenceObjectKey(input.jobId, input.file.originalname);

    try {
      await this.client.putObject(bucket, objectKey, input.file.buffer, input.file.size, {
        "Content-Type": input.file.mimetype
      });
    } catch (error) {
      throw new InternalServerErrorException(`Impossible de stocker le document temporaire: ${String(error)}`);
    }

    return {
      bucket,
      objectKey
    };
  }

  private async ensureBucket() {
    if (this.bucketReady) {
      return;
    }

    const bucket = process.env.MINIO_BUCKET ?? "sigeda-documents";
    const exists = await this.client.bucketExists(bucket);

    if (!exists) {
      await this.client.makeBucket(bucket, process.env.MINIO_REGION ?? "us-east-1");
    }

    this.bucketReady = true;
  }
}
