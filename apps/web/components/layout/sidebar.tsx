"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { navigationItems, type NavigationRole } from "@/lib/navigation";

type SessionUser = {
  role?: NavigationRole | null;
};

export function Sidebar() {
  const pathname = usePathname();
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

  const scopedNavigationItems = useMemo(() => {
    if (isLoading) {
      return navigationItems.filter((item) => !item.roles);
    }

    const role = user?.role ?? null;
    return navigationItems.filter((item) => !item.roles || (role ? item.roles.includes(role) : false));
  }, [isLoading, user?.role]);

  return (
    <aside className="hidden w-76 flex-col border-r border-[#1c3955] bg-[var(--sidebar)] px-5 py-5 text-[var(--sidebar-foreground)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] lg:flex">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#d9b96b]">SIGEDA</p>
        <h1 className="text-[1.45rem] font-semibold leading-tight text-white">Hotel des Monnaies</h1>
        <p className="text-xs uppercase tracking-[0.16em] text-white/58">Banque Centrale du Congo</p>
        <div className="mt-4 h-px w-full bg-[#d9b96b]/20" />
      </div>
      <nav className="mt-6 space-y-1.5">
        {scopedNavigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-xl border px-3.5 py-3 text-sm leading-5 transition ${
              pathname === item.href
                ? "border-[#d9b96b]/35 bg-[#d9b96b]/14 text-white shadow-[inset_3px_0_0_#d9b96b]"
                : "border-transparent text-white/78 hover:border-white/10 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
