import type { ComponentType, SVGProps } from "react";
import { Clock, Eye, Webhook, Zap } from "lucide-react";

import type { ModuleType } from "~/server/mocks/types";

export const FacebookIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={24}
    height={24}
    aria-hidden="true"
    {...props}
  >
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

export const GoogleSheetsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={24}
    height={24}
    aria-hidden="true"
    {...props}
  >
    <path d="M11.318 0H3.27A1.636 1.636 0 001.636 1.636v20.728A1.636 1.636 0 003.27 24h17.455a1.636 1.636 0 001.636-1.636V11.318zm4.09 13.773H8.59v-1.637h6.818zm0 3.272H8.59V15.41h6.818zm0 3.273H8.59v-1.637h6.818zm2.046-11.318h-5.182V4.364l5.182 5.182v-.036z" />
  </svg>
);

export const ScheduleIcon: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <Clock {...props} />
);

export const ManualIcon: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <Zap {...props} />
);

// Stylized B24 mark — approximation of Bitrix24 brand mark. Replace with the
// official SVG in Phase 4 if licensing permits.
export const BitrixIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={24}
    height={24}
    aria-hidden="true"
    {...props}
  >
    <path d="M3 2h10.5a5.5 5.5 0 0 1 3.6 9.65A5.5 5.5 0 0 1 13.5 22H3V2zm3 3v5h4.5a2.5 2.5 0 0 0 0-5H6zm0 8v5h5.5a2.5 2.5 0 0 0 0-5H6z" />
  </svg>
);

export const WatchIcon: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <Eye {...props} />
);

export const WebhookIcon: ComponentType<SVGProps<SVGSVGElement>> = (props) => (
  <Webhook {...props} />
);

export type IntegrationTone =
  | "fb-blue"
  | "sheets-green"
  | "schedule-slate"
  | "manual-indigo"
  | "bitrix-cyan"
  | "watch-violet"
  | "webhook-emerald";

export interface IntegrationMeta {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: IntegrationTone;
  /** Tailwind background class — e.g. `bg-fb-blue/10` */
  tileBg: string;
  /** Tailwind foreground class — e.g. `text-fb-blue` */
  iconColor: string;
}

export function getIntegrationMeta(moduleType: ModuleType): IntegrationMeta {
  if (moduleType === "trigger.schedule") {
    return {
      Icon: ScheduleIcon,
      tone: "schedule-slate",
      tileBg: "bg-schedule-slate/10",
      iconColor: "text-schedule-slate",
    };
  }
  if (moduleType === "trigger.manual") {
    return {
      Icon: ManualIcon,
      tone: "manual-indigo",
      tileBg: "bg-manual-indigo/10",
      iconColor: "text-manual-indigo",
    };
  }
  if (moduleType === "trigger.webhook") {
    return {
      Icon: WebhookIcon,
      tone: "webhook-emerald",
      tileBg: "bg-webhook-emerald/10",
      iconColor: "text-webhook-emerald",
    };
  }
  if (moduleType.startsWith("trigger.watch.")) {
    return {
      Icon: WatchIcon,
      tone: "watch-violet",
      tileBg: "bg-watch-violet/10",
      iconColor: "text-watch-violet",
    };
  }
  if (moduleType.startsWith("bitrix.")) {
    return {
      Icon: BitrixIcon,
      tone: "bitrix-cyan",
      tileBg: "bg-bitrix-cyan/10",
      iconColor: "text-bitrix-cyan",
    };
  }
  if (moduleType.startsWith("fb.")) {
    return {
      Icon: FacebookIcon,
      tone: "fb-blue",
      tileBg: "bg-fb-blue/10",
      iconColor: "text-fb-blue",
    };
  }
  // sheets.*
  return {
    Icon: GoogleSheetsIcon,
    tone: "sheets-green",
    tileBg: "bg-sheets-green/10",
    iconColor: "text-sheets-green",
  };
}
