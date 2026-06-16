"use client";

import Link from "next/link";
import type { DocumentArchiveDetails } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

export function DocumentArchiveDetailsPanel({ archive }: { archive: DocumentArchiveDetails }) {
  return (
    <div className="space-y-6">
      <Card className="border-[color:var(--border)]">
        <div className="border-b border-[color:var(--border)] pb-3">
          <h2 className="text-lg font-semibold text-brand-navy">Consultation du document classe</h2>
        </div>
        <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-900">Reference</dt>
            <dd>{archive.documentReference}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Mouvement</dt>
            <dd>{archive.movementType}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="font-medium text-slate-900">Objet</dt>
            <dd>
              <LongText value={archive.documentTitle} label="Objet du document classe" />
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Direction emettrice</dt>
            <dd>{formatStructureLabel(archive.emitterDirectionCode, archive.emitterDirectionName)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Direction de consultation</dt>
            <dd>{formatStructureLabel(archive.currentDirectionCode, archive.currentDirectionName, archive.directionId)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Bureau</dt>
            <dd>{formatStructureLabel(archive.bureauCode, archive.bureauName, archive.bureauId)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Date de classement</dt>
            <dd>{formatShortDate(archive.archivedAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Date de mise a jour</dt>
            <dd>{formatShortDate(archive.updatedAt ?? archive.archivedAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Classeur</dt>
            <dd>{archive.folderLabel ?? "-"}</dd>
          </div>
        </dl>
      </Card>

      <Card className="border-[color:var(--border)]">
        <div className="border-b border-[color:var(--border)] pb-3">
          <h2 className="text-lg font-semibold text-brand-navy">Actions documentaires</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/documents/${archive.documentId}`}
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Consulter le document
          </Link>
          <Link
            href={`/documents/${archive.documentId}#annotations`}
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Voir les annotations
          </Link>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Cette archive documentaire sert a consulter un document deja classe. Les annotations sont gerees depuis la
          fiche du document afin de conserver un historique unique par document.
        </p>
      </Card>
    </div>
  );
}
