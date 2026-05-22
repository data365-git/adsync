import { AccessSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function AccessPage() {
  const allowedEmails = (process.env.NEXTAUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Access"
        description="View the configured login allowlist."
      />
      <AccessSettingsPage allowedEmails={allowedEmails} />
    </div>
  );
}
