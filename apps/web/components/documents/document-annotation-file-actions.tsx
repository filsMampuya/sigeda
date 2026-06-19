"use client";

import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";

import { getDisplayableErrorMessage } from "@/lib/client-http";

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
  const [isPending, setIsPending] = useState(false);

  async function openFile(disposition: "view" | "download") {
    const route = `/api/documents/${documentId}/annotations/${annotationId}/${disposition}`;

    if (disposition === "view") {
      const previewWindow = createPreviewWindowPlaceholder();
      const response = await fetch(route, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!response.ok) {
        closePreviewWindow(previewWindow);
        const payload = await response.text();
        throw new Error(extractActionMessage(payload) ?? "Le fichier d'annotation n'a pas pu etre charge.");
      }

      const blob = await response.blob();
      openPreviewWindow(blob, resolveFileName(response, fileName), fileName, previewWindow);
      return;
    }

    const response = await fetch(route, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(extractActionMessage(payload) ?? "Le fichier d'annotation n'a pas pu etre charge.");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = resolveFileName(response, fileName);
    link.rel = "noopener noreferrer";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-700">{fileName}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={async () => {
            if (isPending) {
              return;
            }

            setIsPending(true);

            try {
              setMessage(null);
              await openFile("view");
            } catch (error) {
              setMessage(getDisplayableErrorMessage(error));
            } finally {
              setIsPending(false);
            }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-brand-navy disabled:opacity-60"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={async () => {
            if (isPending) {
              return;
            }

            setIsPending(true);

            try {
              setMessage(null);
              await openFile("download");
            } catch (error) {
              setMessage(getDisplayableErrorMessage(error));
            } finally {
              setIsPending(false);
            }
          }}
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

function extractActionMessage(payload: string) {
  if (!payload.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as { message?: string | string[] };

    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join(" ");
    }

    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return parsed.message;
    }
  } catch {
    return payload.trim();
  }

  return payload.trim();
}

function resolveFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = disposition.match(/filename="?([^"]+)"?/i);

  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
}

function createPreviewWindowPlaceholder() {
  const previewWindow = window.open("", "_blank");

  if (!previewWindow) {
    throw new Error("La fenetre de previsualisation a ete bloquee par le navigateur.");
  }

  previewWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Chargement...</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0f172a; color: #e2e8f0; font-family: Arial, sans-serif; }
    body { display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>Chargement du fichier...</body>
</html>`);
  previewWindow.document.close();
  return previewWindow;
}

function closePreviewWindow(previewWindow: Window | null) {
  if (previewWindow && !previewWindow.closed) {
    previewWindow.close();
  }
}

function openPreviewWindow(blob: Blob, title: string, fallbackFileName: string, previewWindow: Window | null) {
  const mimeType = blob.type || "application/octet-stream";

  if (!isPreviewableMimeType(mimeType)) {
    closePreviewWindow(previewWindow);
    const objectUrl = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = fallbackFileName;
    link.rel = "noopener noreferrer";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return;
  }

  if (!previewWindow || previewWindow.closed) {
    throw new Error("La fenetre de previsualisation est indisponible.");
  }

  const objectUrl = URL.createObjectURL(blob);
  const safeTitle = title.replace(/[<>&"]/g, "");
  const encodedUrl = objectUrl.replace(/"/g, "%22");
  const body =
    mimeType.startsWith("image/")
      ? `<div class="image-shell"><img src="${encodedUrl}" alt="${safeTitle}" /></div>`
      : `<iframe src="${encodedUrl}" title="${safeTitle}"></iframe>`;

  previewWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    html, body { margin: 0; height: 100%; background: #0f172a; }
    body { display: flex; align-items: stretch; justify-content: stretch; }
    iframe, .image-shell { border: 0; width: 100%; height: 100%; background: #0f172a; }
    .image-shell { display: flex; align-items: center; justify-content: center; }
    img { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>${body}</body>
</html>`);
  previewWindow.document.close();
  previewWindow.addEventListener("beforeunload", () => URL.revokeObjectURL(objectUrl), { once: true });
}

function isPreviewableMimeType(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/") || mimeType.startsWith("text/");
}
