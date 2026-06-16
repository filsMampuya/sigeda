"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DocumentClassifyButton({
  documentId,
  reference
}: {
  documentId: string;
  reference: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function classifyDocument() {
    const confirmed = window.confirm(
      "Confirmer le classement\n\nCe document sera automatiquement classe dans le classeur approprie de votre bureau."
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/classify`, {
        method: "POST"
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Classement impossible.");
      }

      setFeedback({
        tone: "success",
        text: `Le document ${reference} a ete classe automatiquement avec succes.`
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Classement impossible."
      });
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await classifyDocument();
          })
        }
        className="inline-flex h-10 items-center rounded-xl bg-brand-navy px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Classement..." : "Classer le document"}
      </button>
      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              : "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          }
        >
          {feedback.text}
        </div>
      ) : null}
    </div>
  );
}
