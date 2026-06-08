type DocumentUploadStatusProps = {
  hasFile: boolean;
  uploadMessage: string;
};

export function DocumentUploadStatus({ hasFile, uploadMessage }: DocumentUploadStatusProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-900">Numerisation et OCR</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">PDF</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Image</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">OCR</span>
      </div>
      <p className="mt-4 text-sm text-slate-700">
        {hasFile ? uploadMessage : "Aucun fichier selectionne pour le moment."}
      </p>
    </div>
  );
}
