import type { AuthenticatedUser, User } from "@sigeda/shared/types";

type UserRepositoryLike = {
  getById: (id: string) => Promise<User | null>;
  upsert: (entity: User) => Promise<User>;
};

export class UserProfileService {
  constructor(private readonly repository: UserRepositoryLike) {}

  async resolveProfile(authenticatedUser: AuthenticatedUser) {
    const existing = await this.repository.getById(authenticatedUser.id);

    if (existing) {
      return existing;
    }

    const timestamp = new Date().toISOString();
    const [nom, ...rest] = authenticatedUser.displayName.split(" ").filter(Boolean);
    const prenom = rest.join(" ");

    return this.repository.upsert({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      isActive: true,
      updatedAt: timestamp,
      personne: {
        nom: nom || authenticatedUser.displayName || "Utilisateur",
        prenom: prenom || ""
      },
      matricule: authenticatedUser.id,
      bureau: null,
      dateCreation: timestamp,
      directionId: authenticatedUser.directionId,
      serviceId: authenticatedUser.serviceId,
      bureauId: authenticatedUser.bureauId,
      displayName: authenticatedUser.displayName
    });
  }
}
