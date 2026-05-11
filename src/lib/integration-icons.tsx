import type { ComponentType, SVGProps } from "react";
import { Clock, Zap } from "lucide-react";

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

export type IntegrationTone =
  | "fb-blue"
  | "sheets-green"
  | "schedule-slate"
  | "manual-indigo";

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
