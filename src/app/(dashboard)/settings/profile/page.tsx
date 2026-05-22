import {
  ProfileSettingsPage,
} from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Profile"
        description="Review your signed-in identity and session."
      />
      <ProfileSettingsPage />
    </div>
  );
}
