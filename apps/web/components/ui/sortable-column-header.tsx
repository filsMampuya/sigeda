"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

type SortableColumnHeaderProps = {
  active?: boolean;
  align?: "left" | "right";
  direction?: SortDirection;
  label: string;
  onClick: () => void;
};

export function SortableColumnHeader({
  active = false,
  align = "left",
  direction = "asc",
  label,
  onClick
}: SortableColumnHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
        active
          ? "border-[#c8d5e2] bg-white text-brand-navy shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]"
          : "text-slate-700 hover:border-[#d2dbe5] hover:bg-white/75 hover:text-slate-900",
        align === "right" ? "justify-end" : "justify-start"
      )}
      aria-label={`Trier par ${label}`}
      title={`Trier par ${label}`}
    >
      <span>{label}</span>
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
      )}
    </button>
  );
}

export type { SortDirection };
