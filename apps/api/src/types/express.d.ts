import type { AuthenticatedUser } from "@sigeda/shared/types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
