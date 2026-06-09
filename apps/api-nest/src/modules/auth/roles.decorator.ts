import { SetMetadata } from "@nestjs/common";

export const REQUIRED_ROLES = "required_roles";

export function Roles(...roles: string[]) {
  return SetMetadata(REQUIRED_ROLES, roles);
}
