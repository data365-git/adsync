import { IntegrationsSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Integrations"
        description="Set default integration behaviors."
      />
      <IntegrationsSettingsPage
        bitrixBaseUrl={process.env.BITRIX_BASE_URL ?? null}
      />
    </div>
  );
}
