import { getMockSession } from "~/server/mocks/session";
import { AllowlistGate } from "~/components/auth/AllowlistGate";
import { LoginCard } from "~/components/auth/LoginCard";

/**
 * /login — Auth entry point.
 *
 * Phase 1: uses getMockSession() to determine allowlist status.
 * Phase 2: replace with real NextAuth session check.
 *
 * The page lives outside (dashboard) so it has no Sidebar / TopBar.
 */
export default function LoginPage() {
  const session = getMockSession();

  // If the user is already "logged in" but not allowlisted, show the gate.
  // In Phase 1 MOCK_USER.allowlisted === true so this branch is never hit —
  // but the component is wired so Phase 2 can flip it trivially.
  if (!session.user.allowlisted) {
    return <AllowlistGate />;
  }

  return <LoginCard />;
}
