import path from "node:path";

import { env } from "../config/env";

export class FileUrlService {
  getLocalUrl(documentId: string, fileName: string) {
    return `/local-storage/${documentId}/${fileName}`;
  }

  getFirebasePublicUrl(filePath: string) {
    if (!env.FIREBASE_STORAGE_BUCKET) {
      return "";
    }

    return `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/${filePath}`;
  }

  getAbsoluteLocalDirectory(documentId: string) {
    return path.resolve(process.cwd(), "data", "documents", documentId);
  }
}
