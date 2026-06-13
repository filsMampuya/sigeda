import Link from "next/link";
import type { AuthenticatedUser, Departement, DocumentEntity } from "@sigeda/shared/types";

import { DocumentCollaborationPanel } from "@/components/documents/document-collaboration-panel";
import { DocumentFileActions } from "@/components/documents/document-file-actions";
import { BackButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

export function DocumentDetailsPanel({
  currentUser,
  directions,
  document
}: {
  currentUser: AuthenticatedUser | null;
  directions: Departement[];
  document: DocumentEntity | null;
}) {
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

  const primaryArchive = document.archiveFolders?.[0];

  return (
    <div className="space-y-6">
      <Card className="space-y-4 border-[color:var(--border)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3">
              <BackButton fallbackHref="/documents" label="Retour aux documents" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fiche documentaire
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{document.numeroReference}</p>
            <h3 className="mt-2 text-2xl font-semibold text-brand-navy">
              {document.title ?? document.fileName ?? "Document"}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {document.status ?? "-"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {document.confidentialityLevel ?? "-"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/documents"
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Liste des documents
          </Link>
          <Link
            href={`/archives-documentaires?q=${encodeURIComponent(document.numeroReference)}`}
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Archives documentaires
          </Link>
          {primaryArchive ? (
            <Link
              href={`/classeurs-annuels/${primaryArchive.folderId}`}
              className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
            >
              Classeur annuel
            </Link>
          ) : null}
        </div>
        {document.subject ? <LongText value={document.subject} label="Objet du document" className="text-sm text-slate-700" /> : null}
        {document.description ? (
          <LongText value={document.description} label="Description du document" className="text-sm text-slate-500" />
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Vue metier</h4>
          </div>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
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
              <dd>
                <LongText value={document.referenceCode} label="Code reference" />
              </dd>
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
              <dt className="font-medium text-slate-900">Classement</dt>
              <dd>{document.movementType ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Signataires</dt>
              <dd>
                <LongText
                  value={
                    document.signers?.length
                      ? document.signers
                          .map((signer) =>
                            signer.functionTitle ? `${signer.fullName} (${signer.functionTitle})` : signer.fullName
                          )
                          .join(", ")
                      : document.signerName ?? "-"
                  }
                  label="Signataires"
                />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Version</dt>
              <dd>{document.version}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Destinataires</dt>
              <dd>
                <LongText
                  value={document.receiverDirectionNames?.join(", ") || document.receiverDirectionIds.join(", ") || "-"}
                  label="Directions destinataires"
                />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Copies</dt>
              <dd>
                <LongText
                  value={document.copyDirectionNames?.join(", ") || document.copyDirectionIds.join(", ") || "-"}
                  label="Directions en copie"
                />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Archive le</dt>
              <dd>{formatShortDate(document.archivedAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Classeur</dt>
              <dd>
                {primaryArchive ? (
                  <Link
                    href={`/classeurs-annuels/${primaryArchive.folderId}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    Ouvrir le classeur
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="font-medium text-slate-900">Resume</dt>
              <dd>
                <LongText value={document.summary ?? "-"} label="Resume documentaire" />
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="font-medium text-slate-900">Mots-cles</dt>
              <dd>
                <LongText value={document.keywords.join(", ") || "-"} label="Mots-cles" />
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Numerisation</h4>
          </div>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-medium text-slate-900">Type de fichier</dt>
              <dd>{document.fileKind ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Nom original</dt>
              <dd>
                <LongText value={document.fileName ?? document.originalFileName ?? "-"} label="Nom original du fichier" />
              </dd>
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
                <DocumentFileActions attachmentId={document.attachments[0]?.id} />
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {document.ocrText ? (
        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Texte OCR</h4>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-slate-700">
            {document.ocrText}
          </pre>
        </Card>
      ) : null}

      <DocumentCollaborationPanel currentUser={currentUser} directions={directions} document={document} />
    </div>
  );
}
