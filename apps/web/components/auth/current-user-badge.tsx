"use client";

import { useEffect, useState } from "react";

type SessionUser = {
  email: string;
  displayName: string;
  role: string;
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
    return (
      <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
        Session en cours...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        Session non chargee
      </div>
    );
  }

  const label = user.displayName || user.email || "Utilisateur";

  return (
    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
      {label} · {user.role}
    </div>
  );
}
