export type NavigationRole =
  | "ADMIN"
  | "DIRECTEUR_GENERAL"
  | "DIRECTEUR"
  | "MANAGER"
  | "AGENT"
  | "AUDITEUR"
  | "DIRECTION_GENERALE"
  | "ARCHIVISTE";

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/directions", label: "Directions" },
  { href: "/services", label: "Services" },
  { href: "/bureaux", label: "Bureaux" },
  { href: "/documents", label: "Documents" },
  { href: "/archives-documentaires", label: "Archives documentaires" },
  { href: "/classeurs-annuels", label: "Classeurs annuels" },
  { href: "/audit", label: "Audit", roles: ["ADMIN", "AUDITEUR"] as NavigationRole[] },
  {
    href: "/admin/users",
    label: "Utilisateurs",
    roles: ["ADMIN", "DIRECTEUR_GENERAL", "DIRECTEUR", "MANAGER", "AUDITEUR"] as NavigationRole[]
  },
  { href: "/admin/settings", label: "Mon profil" }
];
