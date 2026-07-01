import { SectionIntro } from "@/components/organization/section-intro";
import { UsersPanel } from "@/components/organization/users-panel";
import { getBureaux, getCurrentUser, getPendingUsers, getUsers } from "@/lib/api";

type AdminUsersPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
  };
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams?.pageSize ?? "10", 10) || 10);
  const [users, pendingUsers, bureaux, currentUser] = await Promise.all([
    getUsers(new URLSearchParams({ page: String(page), pageSize: String(pageSize) })),
    getPendingUsers(),
    getBureaux(),
    getCurrentUser()
  ]);

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Administration"
        title="Utilisateurs"
        description="Comptes utilisateurs et rattachement organisationnel."
      />
      <UsersPanel
        users={users?.items ?? []}
        pendingUsers={pendingUsers?.items ?? []}
        bureaux={(bureaux ?? []).filter((item) => item.type === "Bureau")}
        page={users?.page ?? page}
        pageSize={users?.pageSize ?? pageSize}
        total={users?.total ?? 0}
        totalPages={users?.totalPages ?? 1}
        canCreate={currentUser?.user?.role === "ADMIN"}
      />
    </div>
  );
}
