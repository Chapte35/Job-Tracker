import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Gestion de candidatures",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} bg-bg text-ink min-h-screen`}
        style={{ fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}
      >
        {children}
      </body>
    </html>
  );
}
