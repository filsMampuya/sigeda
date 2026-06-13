"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref: string;
  label?: string;
};

export function BackButton({ fallbackHref, label = "Retour" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7c08a] bg-[#f8f1e0] text-[#7b5a16] transition hover:border-[#b38a2e] hover:bg-[#efdfb6] hover:text-[#5f4410]"
      aria-label={label}
      title={label}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
