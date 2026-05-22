import { SchedulesSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function SchedulesPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Schedules"
        description="Control scheduled scenario execution."
      />
      <SchedulesSettingsPage />
    </div>
  );
}
