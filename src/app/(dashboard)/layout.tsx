import { Sidebar } from "~/components/layout/Sidebar";
import { TopBar } from "~/components/layout/TopBar";
import { CommandPalette } from "~/components/palette/CommandPalette";
import { CommandPaletteProvider } from "~/components/palette/CommandPaletteProvider";
import { auth } from "~/server/auth";
import type { User } from "~/server/mocks/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const user: User = {
    id: session?.user?.id ?? "",
    email: session?.user?.email ?? "",
    name: session?.user?.name ?? "User",
    image: session?.user?.image ?? null,
    allowlisted: true,
    timezone: (session?.user as { timezone?: string })?.timezone ?? "Asia/Tashkent",
    theme: ((session?.user as { theme?: string })?.theme as User["theme"]) ?? "system",
    createdAt: new Date(),
  };

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={user} />
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 px-4 py-6 md:px-8 md:py-8"
          >
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}
