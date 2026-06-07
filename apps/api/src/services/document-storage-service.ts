import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { DocumentFileKind } from "@sigeda/shared/types";
import { storage } from "../config/firebase-admin";
import { env } from "../config/env";
import { FileUrlService } from "./file-url-service";

type StoredFileResult = {
  fileKind: DocumentFileKind;
  filePath: string;
  fileSizeBytes: number;
  fileUrl: string;
  mimeType: string;
  originalFileName: string;
  storageProvider: "LOCAL" | "FIREBASE_STORAGE";
};

function resolveFileKind(mimeType: string): DocumentFileKind {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType.startsWith("image/")) {
    return "IMAGE";
  }

  return "OTHER";
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export class DocumentStorageService {
  constructor(private readonly fileUrlService: FileUrlService) {}

  async save(documentId: string, file: Express.Multer.File, ownerMatricule?: string): Promise<StoredFileResult> {
    const fileKind = resolveFileKind(file.mimetype);
    const extension = path.extname(file.originalname) || (fileKind === "PDF" ? ".pdf" : "");
    const safeName = `${documentId}-${randomUUID()}-${sanitizeFileName(file.originalname) || `source${extension}`}`;
    const matriculeFolder = sanitizeFileName(ownerMatricule || "INCONNU");
    const relativePath = path.join("documents", matriculeFolder, sanitizeFileName(safeName));

    if (storage) {
      const bucket = env.FIREBASE_STORAGE_BUCKET ? storage.bucket(env.FIREBASE_STORAGE_BUCKET) : storage.bucket();
      const normalizedPath = relativePath.replace(/\\/g, "/");
      const bucketFile = bucket.file(normalizedPath);

      await bucketFile.save(file.buffer, {
        resumable: false,
        contentType: file.mimetype,
        metadata: {
          contentType: file.mimetype
        }
      });

      return {
        fileKind,
        filePath: normalizedPath,
        fileSizeBytes: file.size,
        fileUrl: this.fileUrlService.getFirebasePublicUrl(normalizedPath),
        mimeType: file.mimetype,
        originalFileName: file.originalname,
        storageProvider: "FIREBASE_STORAGE"
      };
    }

    const absoluteDirectory = this.fileUrlService.getAbsoluteLocalDirectory(documentId);
    const absolutePath = path.join(absoluteDirectory, sanitizeFileName(safeName));

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      fileKind,
      filePath: relativePath.replace(/\\/g, "/"),
      fileSizeBytes: file.size,
      fileUrl: this.fileUrlService.getLocalUrl(documentId, sanitizeFileName(safeName)),
      mimeType: file.mimetype,
      originalFileName: file.originalname,
      storageProvider: "LOCAL"
    };
  }
}
