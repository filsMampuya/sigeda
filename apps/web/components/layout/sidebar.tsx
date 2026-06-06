import Link from "next/link";

import { navigationItems } from "@/lib/navigation";

export function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col border-r border-[var(--border)] bg-[#102235] px-6 py-8 text-white lg:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Banque Centrale</p>
        <h1 className="mt-3 text-2xl font-semibold">SIGEDA</h1>
        <p className="mt-2 text-sm text-white/70">Archivage electronique de l'Hotel des Monnaies</p>
      </div>
      <nav className="mt-10 space-y-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
