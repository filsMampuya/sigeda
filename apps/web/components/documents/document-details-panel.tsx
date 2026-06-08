import type { DocumentEntity } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { getPublicApiBaseUrl } from "@/lib/env";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

export function DocumentDetailsPanel({ document }: { document: DocumentEntity | null }) {
  const publicApiBaseUrl = getPublicApiBaseUrl();
  const fileHref = document?.urlFileName
    ? document.urlFileName.startsWith("http")
      ? document.urlFileName
      : `${publicApiBaseUrl}${document.urlFileName}`
    : null;

  if (!document) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-brand-navy">Document introuvable</h3>
        <p className="mt-3 text-sm text-slate-600">
          Le document demande n&apos;est pas accessible ou n&apos;existe pas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{document.numeroReference}</p>
            <h3 className="mt-2 text-2xl font-semibold text-brand-navy">
              {document.title ?? document.fileName ?? "Document"}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {document.status ?? "-"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {document.confidentialityLevel ?? "-"}
            </span>
          </div>
        </div>
        {document.subject ? <p className="text-sm text-slate-700">{document.subject}</p> : null}
        {document.description ? <p className="text-sm text-slate-500">{document.description}</p> : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <h4 className="text-lg font-semibold text-brand-navy">Vue metier</h4>
          <dl className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-900">Direction emettrice</dt>
              <dd>{formatStructureLabel(document.direction.code, document.direction.designation, document.directionId)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Annee</dt>
              <dd>{document.year}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Code reference</dt>
              <dd>{document.referenceCode}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Numero annuel</dt>
              <dd>{document.referenceNumber}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Type</dt>
              <dd>{document.type}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Creation</dt>
              <dd>{formatShortDate(document.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Signataire</dt>
              <dd>{document.signerName ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Version</dt>
              <dd>{document.version}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Destinataires</dt>
              <dd>{document.receiverDirectionIds.join(", ") || "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Copies</dt>
              <dd>{document.copyDirectionIds.join(", ") || "-"}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="font-medium text-slate-900">Resume</dt>
              <dd>{document.summary ?? "-"}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="font-medium text-slate-900">Mots-cles</dt>
              <dd>{document.keywords.join(", ") || "-"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h4 className="text-lg font-semibold text-brand-navy">Numerisation</h4>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-medium text-slate-900">Type de fichier</dt>
              <dd>{document.fileKind ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Nom original</dt>
              <dd>{document.fileName ?? document.originalFileName ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Stockage</dt>
              <dd>{document.storageProvider ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Statut numerisation</dt>
              <dd>{document.digitizationStatus ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">OCR</dt>
              <dd>{document.ocrStatus ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Fichier</dt>
              <dd>
                {fileHref ? (
                  <a href={fileHref} target="_blank" rel="noreferrer" className="text-brand-navy underline">
                    Ouvrir le fichier
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {document.ocrText ? (
        <Card>
          <h4 className="text-lg font-semibold text-brand-navy">Texte OCR</h4>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {document.ocrText}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
