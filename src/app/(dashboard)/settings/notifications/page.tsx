import { NotificationsSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Notifications"
        description="Configure failure alerts and quiet hours."
      />
      <NotificationsSettingsPage />
    </div>
  );
}
