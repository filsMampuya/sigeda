import Link from "next/link";
import type { AuthenticatedUser, Departement, DepartementListItem, DocumentEntity } from "@sigeda/shared/types";

import { DocumentCollaborationPanel } from "@/components/documents/document-collaboration-panel";
import { DocumentClassifyButton } from "@/components/documents/document-classify-button";
import { DocumentFileActions } from "@/components/documents/document-file-actions";
import { BackButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

export function DocumentDetailsPanel({
  directions,
  services,
  bureaux,
  document,
  currentUser
}: {
  directions: Departement[];
  services: DepartementListItem[];
  bureaux: DepartementListItem[];
  document: DocumentEntity | null;
  currentUser: AuthenticatedUser | null;
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
  const attachmentCount = document.attachments.length;
  const primaryAttachment = document.attachments[0];
  const annotationAttachmentCount = document.annotations?.filter((annotation) => Boolean(annotation.attachment)).length ?? 0;
  const currentDirectionId = currentUser?.directionId ?? null;
  const participantDirectionIds = new Set(
    [document.emitterDirectionId, ...document.receiverDirectionIds, ...document.copyDirectionIds].filter(
      (directionId): directionId is string => Boolean(directionId)
    )
  );
  const hasClassifiedArchiveForCurrentDirection = Boolean(
    currentDirectionId &&
      document.archiveFolders?.some(
        (archive) => archive.ownerDirectionId === currentDirectionId && Boolean(archive.archivedAt)
      )
  );
  const showClassifyButton = Boolean(
    currentDirectionId &&
      participantDirectionIds.has(currentDirectionId) &&
      document.currentDirectionMovement &&
      !hasClassifiedArchiveForCurrentDirection
  );

  return (
    <div className="space-y-6">
      <Card className="space-y-5 border-[color:var(--border)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <BackButton fallbackHref="/documents" label="Retour aux documents" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fiche documentaire
              </span>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-navy">{document.numeroReference}</p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">
              {document.subject ?? document.title ?? document.fileName ?? "Document"}
            </h3>
            <p className="mt-3 max-w-4xl text-sm text-slate-600">
              {formatStructureLabel(document.direction.code, document.direction.designation, document.directionId)}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
              {document.currentDirectionMovement ?? document.movementType ?? "-"}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
              {document.status ?? "-"}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
              {document.confidentialityLevel ?? "-"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-[color:var(--border)] pt-4">
          <Link
            href="/documents"
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Liste des documents
          </Link>
          {showClassifyButton ? (
            <DocumentClassifyButton
              bureaux={bureaux}
              currentUser={currentUser}
              documentId={document.id}
              reference={document.numeroReference}
              services={services}
            />
          ) : null}
          <a
            href="#document-annotations"
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Annotations
          </a>
        </div>

        <Card className="border-[color:var(--border)]">
          <dl className="grid gap-4 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Direction emettrice</dt>
              <dd>{formatStructureLabel(document.direction.code, document.direction.designation, document.directionId)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Destinataires</dt>
              <dd>
                <LongText
                  value={document.receiverDirectionNames?.join(", ") || document.receiverDirectionIds.join(", ") || "-"}
                  label="Directions destinataires"
                />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Creation</dt>
              <dd>{formatShortDate(document.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Mouvement</dt>
              <dd>{document.currentDirectionMovement ?? document.movementType ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Confidentialite</dt>
              <dd>{document.confidentialityLevel ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Classe le</dt>
              <dd>{formatShortDate(document.currentDirectionArchivedAt ?? document.archivedAt)}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Copies</dt>
              <dd>
                <LongText
                  value={
                    document.copyDirectionNames?.join(", ") || document.copyDirectionIds.join(", ") || "-"
                  }
                  label="Directions en copie"
                />
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Signataires</dt>
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
          </dl>
        </Card>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Bloc documentaire</h4>
          </div>
          <dl className="mt-4 grid gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-medium text-slate-900">Fichier principal</dt>
              <dd>
                <LongText
                  value={primaryAttachment?.name ?? document.fileName ?? document.originalFileName ?? "-"}
                  label="Fichier principal"
                />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Actions documentaires</dt>
              <dd>
                <DocumentFileActions attachmentId={primaryAttachment?.id} fileName={primaryAttachment?.name} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Pieces jointes</dt>
              <dd>{attachmentCount > 0 ? `${attachmentCount} fichier(s)` : "Aucune piece jointe"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Classeur</dt>
              <dd>
                {primaryArchive ? (
                  <Link
                    href={`/classeurs-annuels/${primaryArchive.folderId}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    Ouvrir le classeur annuel
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Archives</dt>
              <dd>
                <Link
                  href={`/archives-documentaires?q=${encodeURIComponent(document.numeroReference)}`}
                  className="font-medium text-brand-navy hover:underline"
                >
                  Consulter les archives documentaires
                </Link>
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Annotations</h4>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nombre</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{document.annotations?.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pieces jointes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{annotationAttachmentCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Derniere annotation</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {document.annotations?.length
                  ? formatShortDate(
                      [...document.annotations].sort(
                        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
                      )[0]!.createdAt
                    )
                  : "Aucune annotation"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {document.annotations?.length
                  ? ([...document.annotations].sort(
                      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
                    )[0]!.sourceDirectionName ??
                    [...document.annotations].sort(
                      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
                    )[0]!.sourceDirectionCode ??
                    "Direction non renseignee")
                  : "Le rapport d'annotations reste replie tant qu'aucune consultation n'est demandee."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="#document-annotations"
              className="inline-flex h-10 items-center rounded-xl border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
            >
              Voir le rapport des annotations
            </a>
          </div>
        </Card>
      </div>

      <details className="group rounded-2xl border border-[color:var(--border)] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-brand-navy">Informations secondaires</p>
            <p className="text-sm text-slate-500">Metadonnees documentaires, numerisation et OCR.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:hidden">Ouvrir</span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:block">Fermer</span>
        </summary>
        <div className="border-t border-[color:var(--border)] px-6 py-5">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <dl className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-900">Annee</dt>
                <dd>{document.year}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Type</dt>
                <dd>{document.type}</dd>
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
              {document.description ? (
                <div className="md:col-span-2">
                  <dt className="font-medium text-slate-900">Description</dt>
                  <dd>
                    <LongText value={document.description} label="Description du document" />
                  </dd>
                </div>
              ) : null}
            </dl>

            <dl className="grid gap-3 text-sm text-slate-600">
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
              {document.ocrText ? (
                <div>
                  <dt className="font-medium text-slate-900">Apercu OCR</dt>
                  <dd>
                    <LongText value={document.ocrText} label="Texte OCR du document" className="text-slate-600" />
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </details>

      <DocumentCollaborationPanel directions={directions} document={document} currentUser={currentUser} />
    </div>
  );
}
