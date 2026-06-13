import { SectionIntro } from "@/components/organization/section-intro";
import { UsersPanel } from "@/components/organization/users-panel";
import { getBureaux, getUsers } from "@/lib/api";

type AdminUsersPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
  };
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const [users, bureaux] = await Promise.all([getUsers(), getBureaux()]);
  const page = Number(searchParams?.page ?? "1");
  const pageSize = Number(searchParams?.pageSize ?? "10");

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Administration"
        title="Utilisateurs"
        description="Comptes utilisateurs et rattachement organisationnel."
      />
      <UsersPanel
        users={users ?? []}
        bureaux={(bureaux ?? []).filter((item) => item.type === "Bureau")}
        page={Number.isFinite(page) ? page : 1}
        pageSize={Number.isFinite(pageSize) ? pageSize : 10}
      />
    </div>
  );
}
