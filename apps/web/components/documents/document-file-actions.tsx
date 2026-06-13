"use client";

import { useState, useTransition } from "react";
import { Download, ExternalLink } from "lucide-react";

import { getPublicOnPremiseApiBaseUrl } from "@/lib/env";
import { getClientAuthToken } from "@/lib/client-auth-token";

type DocumentFileActionsProps = {
  attachmentId?: string;
};

export function DocumentFileActions({ attachmentId }: DocumentFileActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!attachmentId) {
    return <span>-</span>;
  }

  async function openFile(disposition: "view" | "download") {
    const accessToken = await getClientAuthToken();
    const response = await fetch(
      `${getPublicOnPremiseApiBaseUrl()}/attachments/${attachmentId}/access?disposition=${disposition}`,
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
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-brand-navy disabled:opacity-60"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir le fichier
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
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Telecharger
        </button>
      </div>
      {message ? <p className="text-xs text-rose-700">{message}</p> : null}
    </div>
  );
}
