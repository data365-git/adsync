export const FB_METRICS = {
  Delivery: ["impressions", "reach", "frequency", "clicks", "ctr"],
  Cost: ["spend", "cpm", "cpc", "cpp"],
  Conversion: [
    "conversions",
    "conversion_rate",
    "cost_per_conversion",
    "roas",
  ],
  Video: [
    "video_views",
    "video_view_rate",
    "video_p25_watched",
    "video_p100_watched",
  ],
} as const;

export type FbMetricGroup = keyof typeof FB_METRICS;
export type FbMetric = (typeof FB_METRICS)[FbMetricGroup][number];

export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Tashkent", label: "Asia/Tashkent (UZT)" },
  { value: "Asia/Almaty", label: "Asia/Almaty (ALMT)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (PKT)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (TRT)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago", label: "America/Chicago (CT)" },
  { value: "America/Denver", label: "America/Denver (MT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (BRT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
];
