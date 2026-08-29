import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { isClerkConfigured } from "@/lib/auth-config";
import { AppToaster } from "./app-toaster";

import "./globals.css";
import "./styles/workspace-shell.css";
import "./styles/workflow.css";
import "./styles/data-visuals.css";
import "./styles/ai-workbench.css";
import "./styles/onboarding.css";

export const metadata: Metadata = {
  title: "RevFlow | AI-assisted revenue operations",
  description: "Convert contract terms into reviewed billing configuration, usage-backed invoices, revenue schedules, and audit evidence.",
  openGraph: {
    title: "RevFlow | AI-assisted revenue operations",
    description: "Contract-to-revenue workflow with human review, deterministic calculations, and audit evidence.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "RevFlow | AI-assisted revenue operations",
    description: "Contract-to-revenue workflow with human review, deterministic calculations, and audit evidence."
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const document = (
    <html lang="en">
      <body suppressHydrationWarning>{children}<AppToaster /></body>
    </html>
  );

  return isClerkConfigured() ? <ClerkProvider>{document}</ClerkProvider> : document;
}