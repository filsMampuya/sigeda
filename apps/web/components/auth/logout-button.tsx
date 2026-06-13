"use client";

export function LogoutButton() {
  return (
    <a
      href="/api/auth/logout"
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
    >
      Se deconnecter
    </a>
  );
}
