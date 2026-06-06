import type { NextFunction, Request, Response } from "express";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  if (!request.user) {
    return response.status(401).json({ message: "Authentication required." });
  }

  next();
}
