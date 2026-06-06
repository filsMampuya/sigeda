type DocumentUploadStatusProps = {
  hasFile: boolean;
  uploadMessage: string;
};

export function DocumentUploadStatus({ hasFile, uploadMessage }: DocumentUploadStatusProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-900">Numerisation et OCR</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        <li>PDF: televersement et rattachement au dossier documentaire.</li>
        <li>Images scannees: OCR automatique pour lecture du texte.</li>
        <li>Fallback local actif pour la demo, extensible vers Firebase Storage.</li>
      </ul>
      <p className="mt-4 text-sm text-slate-700">{hasFile ? uploadMessage : "Aucun fichier selectionne pour le moment."}</p>
    </div>
  );
}
