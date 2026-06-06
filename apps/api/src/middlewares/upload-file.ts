import Busboy, { type FileInfo } from "busboy";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";

const allowedMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff"
];

const localUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Unsupported file type."));
  }
});

function parseMultipartFromRawBody(fieldName: string, request: Request, response: Response, next: NextFunction) {
  const contentType = request.headers["content-type"];

  if (!contentType?.includes("multipart/form-data") || !request.rawBody) {
    next(new Error("Multipart upload payload is missing."));
    return;
  }

  const busboy = Busboy({
    headers: request.headers,
    limits: {
      fileSize: 25 * 1024 * 1024
    }
  });

  let fileBuffer = Buffer.alloc(0);
  let hasMatchedField = false;
  let hasCompleted = false;
  let uploadError: Error | null = null;
  let fileName = "";
  let mimeType = "";
  let encoding = "";

  busboy.on("file", (name: string, file: NodeJS.ReadableStream, info: FileInfo) => {
    if (name !== fieldName) {
      file.resume();
      return;
    }

    hasMatchedField = true;
    fileName = info.filename;
    mimeType = info.mimeType;
    encoding = info.encoding;

    if (!allowedMimeTypes.includes(mimeType)) {
      uploadError = new Error("Unsupported file type.");
      file.resume();
      return;
    }

    file.on("data", (chunk: Buffer) => {
      fileBuffer = Buffer.concat([fileBuffer, chunk]);
    });

    file.on("limit", () => {
      uploadError = new Error("File exceeds 25MB limit.");
    });
  });

  busboy.on("error", (error: Error) => {
    next(error);
  });

  busboy.on("finish", () => {
    if (hasCompleted) {
      return;
    }

    hasCompleted = true;

    if (uploadError) {
      next(uploadError);
      return;
    }

    if (!hasMatchedField || !fileName) {
      next(new Error("File is required."));
      return;
    }

    request.file = {
      fieldname: fieldName,
      originalname: fileName,
      encoding,
      mimetype: mimeType,
      size: fileBuffer.byteLength,
      buffer: fileBuffer,
      stream: undefined as never,
      destination: "",
      filename: fileName,
      path: ""
    };

    next();
  });

  busboy.end(request.rawBody);
}

export const uploadFile = {
  single(fieldName: string) {
    const localMiddleware = localUpload.single(fieldName);

    return (request: Request, response: Response, next: NextFunction) => {
      if (request.rawBody && process.env.FUNCTION_TARGET) {
        parseMultipartFromRawBody(fieldName, request, response, next);
        return;
      }

      localMiddleware(request, response, next);
    };
  }
};
