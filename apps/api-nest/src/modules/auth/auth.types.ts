export type AuthenticatedPrincipal = {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  departmentId?: string;
};
