import Link from "next/link";

import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { DocumentTable } from "@/components/documents/document-table";
import { getDashboardStats, getDocuments } from "@/lib/api";

export default async function DashboardPage() {
  const [stats, documents] = await Promise.all([getDashboardStats(), getDocuments()]);

  const metrics = [
    { label: "Documents", value: String(stats?.totalDocuments ?? 0) },
    { label: "En validation", value: String(stats?.pendingValidation ?? 0) },
    { label: "Archives physiques", value: String(stats?.archivedDocuments ?? 0) },
    { label: "Taux de numerisation", value: `${Math.round((stats?.digitizationRate ?? 0) * 100)}%` }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href="/documents/new"
          className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white"
        >
          Importer un document
        </Link>
      </div>
      <DashboardCards metrics={metrics} />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <DocumentTable rows={documents ?? []} />
        <RecentActivityCard logs={stats?.recentActivity ?? []} />
      </div>
    </div>
  );
}
