import { CurrentUserBadge } from "@/components/auth/current-user-badge";
import { LogoutButton } from "@/components/auth/logout-button";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--header-tint)] px-5 py-3 shadow-[0_1px_0_rgba(16,38,60,0.04)]">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">SIGEDA</p>
        <h2 className="text-base font-semibold text-brand-navy">Hotel des Monnaies</h2>
      </div>
      <div className="flex items-center gap-3">
        <CurrentUserBadge />
        <LogoutButton />
      </div>
    </header>
  );
}
