export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-white/80 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Direction Generale</p>
        <h2 className="text-lg font-semibold text-slate-900">Pilotage documentaire</h2>
      </div>
      <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Profil demo: ADMIN
      </div>
    </header>
  );
}
