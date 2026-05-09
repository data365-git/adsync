import { Sidebar } from "~/components/layout/Sidebar";
import { TopBar } from "~/components/layout/TopBar";
import { getMockSession } from "~/server/mocks/session";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getMockSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={session.user} />
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
