import packageJson from "../../../../../package.json";

import { AboutSettingsPage } from "~/components/settings/SettingsPages";
import { SettingsPageHeader } from "~/components/settings/SettingsState";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="About"
        description="Deployment and repository information."
      />
      <AboutSettingsPage
        version={packageJson.version}
        commitSha={process.env.RAILWAY_GIT_COMMIT_SHA ?? "dev"}
        deploymentId={process.env.RAILWAY_DEPLOYMENT_ID ?? "local"}
      />
    </div>
  );
}
