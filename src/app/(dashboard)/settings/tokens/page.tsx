import { TokensSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function TokensPage() {
  const token = process.env.TOKEN_ENC_KEY;
  const tokenSuffix = token ? `****${token.slice(-4)}` : null;

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Tokens"
        description="Inspect token encryption status."
      />
      <TokensSettingsPage tokenSuffix={tokenSuffix} />
    </div>
  );
}
