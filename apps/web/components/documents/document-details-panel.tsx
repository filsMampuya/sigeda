import type { DocumentEntity } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { getPublicApiBaseUrl } from "@/lib/env";

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
          Le document demande n'est pas accessible ou n'existe pas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{document.numeroReference}</p>
        <h3 className="mt-2 text-2xl font-semibold text-brand-navy">
          {document.title ?? document.fileName ?? "Document"}
        </h3>
        <p className="mt-3 text-sm text-slate-600">{document.description ?? "Aucune description fournie."}</p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <h4 className="text-lg font-semibold text-brand-navy">Metadonnees</h4>
          <dl className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-600">
            <div>
              <dt className="font-medium text-slate-900">Type</dt>
              <dd>{document.type}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Confidentialite</dt>
              <dd>{document.confidentialityLevel ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Statut</dt>
              <dd>{document.status ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Version</dt>
              <dd>{document.version}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Direction</dt>
              <dd>{document.direction.designation}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Service</dt>
              <dd>{document.serviceId ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Bureau</dt>
              <dd>{document.bureauId ?? "-"}</dd>
            </div>
            <div>
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
              <dt className="font-medium text-slate-900">Statut de numerisation</dt>
              <dd>{document.digitizationStatus ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Statut OCR</dt>
              <dd>{document.ocrStatus ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Acces fichier</dt>
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
          <h4 className="text-lg font-semibold text-brand-navy">Texte OCR extrait</h4>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {document.ocrText}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
