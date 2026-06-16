"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <main className="min-h-screen bg-[var(--background)] p-6">{children}</main>;
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[var(--background)]">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1680px] min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
