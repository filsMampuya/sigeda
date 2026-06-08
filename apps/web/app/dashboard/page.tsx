import Link from "next/link";

import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardDocumentListCard } from "@/components/dashboard/dashboard-document-list-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { getDashboardStats, getRecentDocuments } from "@/lib/api";

export default async function DashboardPage() {
  const [stats, recentData] = await Promise.all([
    getDashboardStats(),
    getRecentDocuments(new URLSearchParams({ pageSize: "5" }))
  ]);

  const metrics = [
    { label: "Documents", value: String(stats?.totalDocuments ?? 0), tone: "accent" as const },
    { label: "En validation", value: String(stats?.pendingValidation ?? 0) },
    { label: "Archives", value: String(stats?.archivedDocuments ?? 0) },
    { label: "Numérisation", value: `${Math.round((stats?.digitizationRate ?? 0) * 100)}%` }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/documents"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Documents
          </Link>
          <Link
            href="/documents/new"
            className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white"
          >
            Nouveau
          </Link>
        </div>
      </div>
      <DashboardCards metrics={metrics} />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
        <DashboardDocumentListCard
          data={recentData}
          title="Récents"
          emptyLabel="Aucun document."
        />
        <DashboardDocumentListCard
          data={
            recentData
              ? {
                  ...recentData,
                  items: recentData.items.filter((d) => d.status === "EN_VALIDATION")
                }
              : null
          }
          title="En attente"
          emptyLabel="Aucun document."
        />
        <RecentActivityCard logs={stats?.recentActivity ?? []} />
      </div>
    </div>
  );
}
