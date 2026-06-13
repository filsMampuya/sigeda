"use client";

import { useEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";

type ColumnDefinition = {
  id: string;
  label: string;
};

type ColumnVisibilityMenuProps = {
  columns: ColumnDefinition[];
  onChange: (next: string[]) => void;
  value: string[];
};

export function ColumnVisibilityMenu({ columns, onChange, value }: ColumnVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-50"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Colonnes
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-20 min-w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Personnaliser l'affichage
          </p>
          <div className="space-y-2">
            {columns.map((column) => {
              const checked = value.includes(column.id);

              return (
                <label key={column.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked && value.length === 1) {
                        return;
                      }

                      onChange(
                        checked ? value.filter((item) => item !== column.id) : [...value, column.id]
                      );
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--sidebar)] focus:ring-[var(--accent)]"
                  />
                  <span>{column.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
