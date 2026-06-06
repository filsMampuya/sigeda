import type { Role } from "@sigeda/shared/constants";
import type { NextFunction, Request, Response } from "express";

export function requireRole(roles: Role[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) {
      return response.status(401).json({ message: "Authentication required." });
    }

    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ message: "Access denied." });
    }

    next();
  };
}
