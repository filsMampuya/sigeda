import type { Request, Response } from "express";

import { userProfileService } from "../services/registry";

export const authController = {
  async me(request: Request, response: Response) {
    const profile = request.user ? await userProfileService.resolveProfile(request.user) : null;

    response.json({
      user: profile
        ? {
            id: profile.id,
            email: profile.email,
            displayName:
              profile.displayName ??
              [profile.personne.nom, profile.personne.prenom].filter(Boolean).join(" ").trim(),
            role: profile.role,
            directionId: profile.directionId ?? null,
            serviceId: profile.serviceId ?? null,
            bureauId: profile.bureauId ?? null
          }
        : request.user ?? null
    });
  }
};
