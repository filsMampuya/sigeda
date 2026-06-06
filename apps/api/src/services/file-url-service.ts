import path from "node:path";

import { env } from "../config/env";

export class FileUrlService {
  getLocalUrl(documentId: string, fileName: string) {
    return `/local-storage/${documentId}/${fileName}`;
  }

  getFirebasePublicUrl(filePath: string) {
    const bucketName =
      env.FIREBASE_STORAGE_BUCKET ??
      env.FIREBASE_PROJECT_ID ??
      env.GCLOUD_PROJECT ??
      env.GOOGLE_CLOUD_PROJECT ??
      env.PROJECT_ID;

    if (!bucketName) {
      return "";
    }

    const normalizedBucketName = bucketName.includes(".")
      ? bucketName
      : `${bucketName}.firebasestorage.app`;

    return `https://storage.googleapis.com/${normalizedBucketName}/${filePath}`;
  }

  getAbsoluteLocalDirectory(documentId: string) {
    return path.resolve(process.cwd(), "data", "documents", documentId);
  }
}
