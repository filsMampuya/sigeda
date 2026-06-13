import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  label: string;
  required?: boolean;
};

export function FormField({ children, className, description, label, required = false }: FormFieldProps) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {description ? <span className="block text-xs text-slate-500">{description}</span> : null}
    </label>
  );
}
