import Link from "next/link";

import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardDocumentListCard } from "@/components/dashboard/dashboard-document-list-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { PageHeader } from "@/components/ui/page-header";
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
    { label: "Annotes", value: String(stats?.annotatedDocuments ?? 0) },
    { label: "Multi-versions", value: String(stats?.versionedDocuments ?? 0) },
    { label: "Numerisation", value: `${Math.round((stats?.digitizationRate ?? 0) * 100)}%` }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accueil"
        title="Tableau de bord"
        actions={
          <>
            <Link
              href="/documents"
              className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-3.5 text-sm font-medium text-slate-700"
            >
              Ouvrir les documents
            </Link>
            <Link
              href="/documents/new"
              className="inline-flex h-10 items-center rounded-xl bg-brand-navy px-4 text-sm font-medium text-white"
            >
              Nouveau document
            </Link>
          </>
        }
      />

      <DashboardCards metrics={metrics} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[color:var(--border)] p-0">
          <div className="border-b border-[color:var(--border)] bg-[var(--header-tint)] px-5 py-3">
            <h3 className="text-sm font-semibold text-brand-navy">Directions les plus annotatrices</h3>
          </div>
          <div className="space-y-2.5 px-4 py-4">
            {(stats?.topAnnotatingDirections?.length ?? 0) > 0 ? (
              stats?.topAnnotatingDirections?.slice(0, 5).map((entry) => (
                <div
                  key={`${entry.key}-${entry.count}`}
                  className="flex items-start justify-between gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] px-3.5 py-3"
                >
                  <LongText
                    value={entry.label ?? entry.key}
                    label="Direction source d'annotation"
                    className="text-sm font-medium text-slate-900"
                  />
                  <span className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-brand-navy">
                    {entry.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">Aucune annotation consolidee pour le moment.</p>
            )}
          </div>
        </Card>

        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h3 className="text-sm font-semibold text-brand-navy">Indicateurs de cycle</h3>
          </div>
          <dl className="mt-4 space-y-4 text-sm text-slate-600">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Moyenne de versions avant validation</dt>
              <dd className="mt-1 text-2xl font-semibold text-brand-navy">
                {Number(stats?.averageVersionsBeforeValidation ?? 0).toFixed(1)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Documents annotes</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{stats?.annotatedDocuments ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Documents multi-versions</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{stats?.versionedDocuments ?? 0}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
        <DashboardDocumentListCard data={recentData} title="Recents" emptyLabel="Aucun document." />
        <DashboardDocumentListCard
          data={
            recentData
              ? {
                  ...recentData,
                  items: recentData.items.filter((document) => document.status === "EN_VALIDATION")
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
