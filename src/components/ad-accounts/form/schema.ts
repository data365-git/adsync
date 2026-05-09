import { z } from "zod";

export const LevelSchema = z.enum(["CAMPAIGN", "AD"]);

export const AdAccountFormSchema = z.object({
  label: z.string().min(1, "Label is required").max(60, "Max 60 characters"),
  fbAccountId: z.string().min(1, "Facebook Ad Account is required"),
  enabled: z.boolean(),
  levels: z
    .array(LevelSchema)
    .min(1, "At least one level (Campaign or Ad) must be selected"),
  metrics: z.array(z.string()).min(1, "At least one metric must be selected"),
  dateWindowDays: z.number().int().min(1).max(30),
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
  campaignTabName: z.string().min(1, "Campaign tab name is required"),
  adTabName: z.string().min(1, "Ad tab name is required"),
  cronExpression: z.string(),
  timezone: z.string().min(1, "Timezone is required"),
});

export type AdAccountFormValues = z.infer<typeof AdAccountFormSchema>;

export type Level = z.infer<typeof LevelSchema>;

export const DEFAULT_FORM_VALUES: AdAccountFormValues = {
  label: "",
  fbAccountId: "",
  enabled: false,
  levels: ["CAMPAIGN", "AD"],
  metrics: [],
  dateWindowDays: 7,
  spreadsheetId: "",
  campaignTabName: "Campaigns",
  adTabName: "Ads",
  cronExpression: "0 6 * * *",
  timezone: "Asia/Tashkent",
};
