"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PaginatedResult } from "@sigeda/shared/types";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function PaginationControls({ page, pageSize, total, totalPages }: PaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(nextPage: number, nextPageSize = pageSize) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextPageSize));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm text-slate-600">
        {total} element{total > 1 ? "s" : ""} • page {page} / {totalPages}
      </p>
      <div className="flex items-center gap-3">
        <select
          value={String(pageSize)}
          onChange={(event) => updateParams(1, Number.parseInt(event.target.value, 10))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>
        <button
          type="button"
          onClick={() => updateParams(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Precedent
        </button>
        <button
          type="button"
          onClick={() => updateParams(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

export function EmptyPaginatedResult<T>(): PaginatedResult<T> {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1
  };
}
