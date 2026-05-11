import { Sidebar } from "~/components/layout/Sidebar";
import { TopBar } from "~/components/layout/TopBar";
import { auth } from "~/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Build a User-shaped object compatible with TopBar / UserMenu.
  // Middleware ensures we are authenticated before this layout renders,
  // so session should always be present. The fallback values are defensive.
  const user = {
    id: session?.user?.id ?? "",
    email: session?.user?.email ?? "",
    name: session?.user?.name ?? session?.user?.email ?? "User",
    image: session?.user?.image ?? null,
    allowlisted: true,
    timezone: "Asia/Tashkent",
    theme: "system" as const,
    createdAt: new Date(),
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 px-4 py-6 md:px-8 md:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
