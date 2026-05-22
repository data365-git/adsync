import { DangerSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function DangerPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Danger"
        description="Export or permanently remove account data."
      />
      <DangerSettingsPage />
    </div>
  );
}
