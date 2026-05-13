import "~/styles/globals.css";

import { type Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "adsync",
  description:
    "Personal dashboard for orchestrating Facebook Ads → Google Sheets syncs.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <a
          href="#main"
          className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:shadow focus:ring-2"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <NuqsAdapter>
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </NuqsAdapter>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
