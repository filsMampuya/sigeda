import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  actions?: ReactNode;
  className?: string;
  description?: string;
  eyebrow: string;
  title: string;
};

export function PageHeader({ actions, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <Card className={cn("flex flex-wrap items-start justify-between gap-4 px-6 py-5", className)}>
      <div className="min-w-0 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-brand-navy">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </Card>
  );
}
