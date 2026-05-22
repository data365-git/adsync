import { WorkspaceSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Workspace"
        description="Set workspace defaults for dates and localization."
      />
      <WorkspaceSettingsPage />
    </div>
  );
}
