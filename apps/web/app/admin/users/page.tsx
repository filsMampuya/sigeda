import { SectionIntro } from "@/components/organization/section-intro";
import { UsersPanel } from "@/components/organization/users-panel";
import { getBureaux, getUsers } from "@/lib/api";

export default async function AdminUsersPage() {
  const [users, bureaux] = await Promise.all([getUsers(), getBureaux()]);

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Administration"
        title="Utilisateurs"
        description="Consultez la liste des utilisateurs et creez de nouveaux comptes avec rattachement organisationnel."
      />
      <UsersPanel users={users ?? []} bureaux={(bureaux ?? []).filter((item) => item.type === "Bureau")} />
    </div>
  );
}
