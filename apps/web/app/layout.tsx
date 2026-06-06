import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Merriweather_Sans } from "next/font/google";

import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const sans = Merriweather_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "SIGEDA",
  description: "Systeme integre de gestion electronique des documents et archives"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${sans.variable} font-sans`}>
        <AuthSessionSync />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
