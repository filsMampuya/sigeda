import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)]",
        className
      )}
      {...props}
    />
  );
}
