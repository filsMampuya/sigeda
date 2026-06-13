"use client";

import { useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

type SearchableOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  className?: string;
  emptyMessage?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  value?: string;
};

export function SearchableSelect({
  className,
  emptyMessage = "Aucune option correspondante.",
  name,
  onValueChange,
  options,
  placeholder = "Rechercher",
  value = ""
}: SearchableSelectProps) {
  const listId = useId();
  const [searchTerm, setSearchTerm] = useState(() => options.find((option) => option.value === value)?.label ?? "");

  const filteredOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, searchTerm]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";

  function commitSelection(nextLabel: string) {
    const exactMatch = options.find((option) => option.label.toLowerCase() === nextLabel.trim().toLowerCase());
    const nextValue = exactMatch?.value ?? "";
    setSearchTerm(exactMatch?.label ?? nextLabel);
    onValueChange?.(nextValue);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          list={listId}
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            const exactMatch = options.find((option) => option.label.toLowerCase() === event.target.value.trim().toLowerCase());
            onValueChange?.(exactMatch?.value ?? "");
          }}
          onBlur={(event) => commitSelection(event.target.value)}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
          placeholder={placeholder}
        />
        {searchTerm || selectedLabel ? (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              onValueChange?.("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Effacer la selection"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <datalist id={listId}>
          {filteredOptions.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
      </div>
      {searchTerm.trim() && !filteredOptions.length ? (
        <p className="text-xs text-slate-500">{emptyMessage}</p>
      ) : null}
    </div>
  );
}
