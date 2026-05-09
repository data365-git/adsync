import { ThemeToggle } from "~/components/providers/ThemeProvider";
import { UserMenu } from "~/components/layout/UserMenu";
import type { User } from "~/server/mocks/types";

export function TopBar({ user }: { user: User }) {
  return (
    <header
      className="bg-background/80 border-border supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-4 backdrop-blur md:px-8"
      role="banner"
    >
      <div className="font-semibold tracking-tight md:hidden">Automation</div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
