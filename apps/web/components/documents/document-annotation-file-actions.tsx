"use client";

import { useState, useTransition } from "react";
import { Download, ExternalLink } from "lucide-react";

import { getClientAuthToken } from "@/lib/client-auth-token";
import { getPublicOnPremiseApiBaseUrl } from "@/lib/env";

type DocumentAnnotationFileActionsProps = {
  documentId: string;
  annotationId: string;
  fileName: string;
};

export function DocumentAnnotationFileActions({
  documentId,
  annotationId,
  fileName
}: DocumentAnnotationFileActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function openFile(disposition: "view" | "download") {
    const accessToken = await getClientAuthToken();
    const response = await fetch(
      `${getPublicOnPremiseApiBaseUrl()}/documents/${documentId}/annotations/${annotationId}/access?disposition=${disposition}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? "Impossible d'ouvrir le fichier.");
    }

    const payload = (await response.json()) as { url: string };
    window.open(payload.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-700">{fileName}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setMessage(null);
                await openFile("view");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Ouverture impossible.");
              }
            })
          }
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-brand-navy disabled:opacity-60"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setMessage(null);
                await openFile("download");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Telechargement impossible.");
              }
            })
          }
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Telecharger
        </button>
      </div>
      {message ? <p className="text-xs text-rose-700">{message}</p> : null}
    </div>
  );
}
