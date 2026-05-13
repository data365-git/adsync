import { ThemeToggle } from "~/components/providers/ThemeProvider";
import { UserMenu } from "~/components/layout/UserMenu";
import type { User } from "~/server/mocks/types";

// Mobile-only top bar — on desktop (md+) the user and theme controls live in
// the sidebar footer and this bar is hidden entirely.
export function TopBar({ user }: { user: User }) {
  return (
    <header
      className="bg-background/80 border-border supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 backdrop-blur md:hidden"
      role="banner"
    >
      <div className="tracking-tight">adsync</div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
