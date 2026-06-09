"use client";

export function LogoutButton() {
  return (
    <a
      href="/api/auth/logout"
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
    >
      Se deconnecter
    </a>
  );
}
