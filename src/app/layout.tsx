import "~/styles/globals.css";

import { type Metadata } from "next";

import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Automation Dashboard",
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
        <ThemeProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
