import type { AuditLog, DocumentEntity } from "@sigeda/shared/types";

export class DashboardService {
  constructor(
    private readonly documentRepository: {
      list: () => Promise<DocumentEntity[]>;
    },
    private readonly auditLogRepository: {
      list: () => Promise<AuditLog[]>;
    }
  ) {}

  async getStats() {
    const [documents, auditLogs] = await Promise.all([
      this.documentRepository.list(),
      this.auditLogRepository.list()
    ]);

    return {
      totalDocuments: documents.length,
      documentsByDirection: aggregateBy(documents, "directionId"),
      documentsByService: aggregateBy(documents, "serviceId"),
      documentsByBureau: aggregateBy(documents, "bureauId"),
      confidentialDocuments: documents.filter((doc) =>
        ["CONFIDENTIEL", "SECRET", "TRES_SECRET"].includes(doc.confidentialityLevel)
      ).length,
      archivedDocuments: documents.filter((doc) => doc.status === "ARCHIVE").length,
      pendingValidation: documents.filter((doc) => doc.status === "EN_VALIDATION").length,
      recentActivity: auditLogs.slice(0, 5),
      digitizationRate: documents.filter((doc) => Boolean(doc.fileUrl)).length / Math.max(documents.length, 1),
      mostViewedDocuments: documents.slice(0, 5).map((document) => ({
        id: document.id,
        reference: document.reference,
        title: document.title
      }))
    };
  }
}

function aggregateBy<T, K extends keyof T>(items: T[], field: K) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = item[field];
    if (typeof key === "string") {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
}
