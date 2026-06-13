"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionUser = {
  email: string;
  displayName: string;
  role: string;
  directionId?: string | null;
  serviceId?: string | null;
  bureauId?: string | null;
};

export function CurrentUserBadge() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as { user?: SessionUser | null };
        return payload.user ?? null;
      })
      .then((nextUser) => {
        if (isActive) {
          setUser(nextUser);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-600">Session</div>;
  }

  if (!user) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-800">Session indisponible</div>;
  }

  const label = user.displayName || user.email || "Utilisateur";
  const scope = user.bureauId ? "Bureau" : user.serviceId ? "Service" : user.directionId ? "Direction" : "Acces";

  return (
    <Link
      href="/admin/settings"
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="font-medium text-slate-900">{label}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {user.role} · {scope}
      </div>
    </Link>
  );
}
