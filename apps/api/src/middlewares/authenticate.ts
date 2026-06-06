import { isRole } from "@sigeda/shared/constants";
import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { firebaseAuth } from "../config/firebase-admin";

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    if (!env.FIREBASE_PROJECT_ID) {
      request.user = {
        id: "usr-admin",
        email: "admin@sigeda.local",
        displayName: "Admin SIGEDA",
        role: "ADMIN",
        directionId: null,
        serviceId: null,
        bureauId: null
      };
    }
    return next();
  }

  const token = header.replace("Bearer ", "");

  try {
    if (!firebaseAuth) {
      return next();
    }
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const roleClaim = typeof decodedToken.role === "string" && isRole(decodedToken.role) ? decodedToken.role : "AGENT";
    request.user = {
      id: decodedToken.uid,
      email: decodedToken.email ?? "",
      displayName: decodedToken.name ?? "",
      role: roleClaim,
      directionId: (decodedToken.directionId as string | undefined) ?? null,
      serviceId: (decodedToken.serviceId as string | undefined) ?? null,
      bureauId: (decodedToken.bureauId as string | undefined) ?? null
    };
    next();
  } catch (error) {
    next(error);
  }
}
