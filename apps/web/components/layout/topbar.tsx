import { CurrentUserBadge } from "@/components/auth/current-user-badge";
import { LogoutButton } from "@/components/auth/logout-button";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-white/80 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Direction Generale</p>
        <h2 className="text-lg font-semibold text-slate-900">Pilotage documentaire</h2>
      </div>
      <div className="flex items-center gap-3">
        <CurrentUserBadge />
        <LogoutButton />
      </div>
    </header>
  );
}
