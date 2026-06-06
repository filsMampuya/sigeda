import type { AuthenticatedUser } from "@sigeda/shared/types";

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      rawBody?: Buffer;
      user?: AuthenticatedUser;
    }
  }
}

export {};
