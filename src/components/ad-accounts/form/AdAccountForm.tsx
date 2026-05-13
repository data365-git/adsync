"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheetIcon,
  SaveIcon,
  XIcon,
  AlertCircleIcon,
  RotateCcwIcon,
  UserIcon,
  Clock as ClockIcon,
} from "lucide-react";
import { FacebookIcon, GoogleSheetsIcon } from "~/lib/integration-icons";
import { api } from "~/trpc/react";
import { Switch } from "~/components/ui/switch";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { FormSection } from "./FormSection";
import { FbAccountPicker } from "./FbAccountPicker";
import { LevelCheckboxes } from "./LevelCheckboxes";
import { MetricsMultiSelect } from "./MetricsMultiSelect";
import { DateWindowSlider } from "./DateWindowSlider";
import { CronBuilder } from "./CronBuilder";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";
import {
  AdAccountFormSchema,
  DEFAULT_FORM_VALUES,
  type AdAccountFormValues,
} from "./schema";
import type { AdAccount } from "~/server/mocks/types";

// ─── Props ───────────────────────────────────────────────────────────────────

interface AdAccountFormProps {
  mode: "new" | "edit";
  initialData?: AdAccount;
  /**
   * Optional success/cancel handlers. When provided (e.g. when the form is
   * embedded in a modal) the form calls these instead of navigating to
   * /ad-accounts via the router. Useful for in-place create/edit dialogs.
   */
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Field-level error type ───────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof AdAccountFormValues, string>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accountToFormValues(account: AdAccount): AdAccountFormValues {
  return {
    label: account.label,
    fbAccountId: account.fbAccountId,
    enabled: account.enabled,
    levels: account.levels,
    metrics: account.metrics,
    dateWindowDays: account.dateWindowDays,
    spreadsheetId: account.spreadsheetId,
    campaignTabName: account.campaignTabName,
    adTabName: account.adTabName,
    cronExpression: account.cronExpression,
    timezone: account.timezone,
  };
}

function deepEqual(a: AdAccountFormValues, b: AdAccountFormValues): boolean {
  return (
    a.label === b.label &&
    a.fbAccountId === b.fbAccountId &&
    a.enabled === b.enabled &&
    JSON.stringify([...a.levels].sort()) ===
      JSON.stringify([...b.levels].sort()) &&
    JSON.stringify([...a.metrics].sort()) ===
      JSON.stringify([...b.metrics].sort()) &&
    a.dateWindowDays === b.dateWindowDays &&
    a.spreadsheetId === b.spreadsheetId &&
    a.campaignTabName === b.campaignTabName &&
    a.adTabName === b.adTabName &&
    a.cronExpression === b.cronExpression &&
    a.timezone === b.timezone
  );
}

function validateField(
  field: keyof AdAccountFormValues,
  values: AdAccountFormValues,
): string | undefined {
  const result = AdAccountFormSchema.safeParse(values);
  if (result.success) return undefined;
  const fieldErrors = result.error.flatten().fieldErrors;
  const errs = fieldErrors[field];
  return errs?.[0];
}

function validateAll(values: AdAccountFormValues): FormErrors {
  const result = AdAccountFormSchema.safeParse(values);
  if (result.success) return {};
  const flat = result.error.flatten().fieldErrors;
  const errors: FormErrors = {};
  for (const key of Object.keys(flat) as (keyof AdAccountFormValues)[]) {
    const errs = flat[key];
    if (errs?.[0]) errors[key] = errs[0];
  }
  return errors;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FormSkeleton() {
  return (
    <div
      className="space-y-8 motion-safe:animate-pulse motion-reduce:opacity-70"
      aria-busy="true"
      aria-label="Loading form"
    >
      {/* Enabled toggle skeleton */}
      <div className="border-border bg-muted/30 flex items-center gap-3 rounded-xl border p-4">
        <div className="bg-muted h-5 w-8 rounded-full" />
        <div className="space-y-1">
          <div className="bg-muted h-4 w-28 rounded" />
          <div className="bg-muted h-3 w-48 rounded" />
        </div>
      </div>

      {/* Section skeletons */}
      {[{ fields: 2 }, { fields: 4 }, { fields: 2 }, { fields: 3 }].map(
        (section, i) => (
          <div key={i} className="space-y-4">
            <div className="border-border border-b pb-3">
              <div className="bg-muted h-4 w-32 rounded" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: section.fields }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="bg-muted h-3 w-24 rounded" />
                  <div className="bg-muted h-8 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ),
      )}

      {/* Footer skeleton */}
      <div className="border-border bg-background/95 sticky bottom-0 border-t py-4">
        <div className="flex items-center justify-end gap-2">
          <div className="bg-muted h-8 w-20 rounded-lg" />
          <div className="bg-muted h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdAccountForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: AdAccountFormProps) {
  const router = useRouter();

  const initialValues = React.useMemo(
    () =>
      initialData ? accountToFormValues(initialData) : DEFAULT_FORM_VALUES,
    [initialData],
  );

  const [values, setValues] =
    React.useState<AdAccountFormValues>(initialValues);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof AdAccountFormValues, boolean>>
  >({});
  const [submitAttempted, setSubmitAttempted] = React.useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Fetch FB accounts for picker
  const { data: fbAccounts, isLoading: fbLoading } =
    api.fb.listAvailableAccounts.useQuery();

  // Mutations
  const createMutation = api.adAccounts.create.useMutation();
  const updateMutation = api.adAccounts.update.useMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Dirtiness — compare field-by-field, not just "touched"
  const isDirty = !deepEqual(values, initialValues);

  // Re-validate dirty fields on each value change
  React.useEffect(() => {
    if (!submitAttempted) return;
    setErrors(validateAll(values));
  }, [values, submitAttempted]);

  // ─── Field helpers ──────────────────────────────────────────────────────────

  function setField<K extends keyof AdAccountFormValues>(
    key: K,
    value: AdAccountFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function blurField(key: keyof AdAccountFormValues) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    // Validate on blur (even before submit attempt)
    const next = { ...values };
    const err = validateField(key, next);
    setErrors((prev) => ({ ...prev, [key]: err }));
  }

  function getError(key: keyof AdAccountFormValues): string | undefined {
    // Show errors if: submit attempted OR field has been touched
    if (!submitAttempted && !touched[key]) return undefined;
    return errors[key];
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    const allErrors = validateAll(values);
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) return;

    setSaveError(null);
    try {
      if (mode === "new") {
        await createMutation.mutateAsync(values);
      } else if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: values });
      }

      // ─── Phase 1.5 note ─────────────────────────────────────────────────
      // Saving an AdAccount implicitly creates/updates a QUICK_SETUP Scenario
      // at `scn_quick_<adAccountId>`. In Phase 2 this will fan out to
      // `scenariosRouter.upsert(...)`. For now it is a no-op — the matching
      // scenario already exists in MOCK_SCENARIOS and reflects this account's
      // config field-for-field.
      // ────────────────────────────────────────────────────────────────────

      if (onSuccess) onSuccess();
      else router.push("/ad-accounts");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setSaveError(msg);
    }
  }

  // ─── Discard ────────────────────────────────────────────────────────────────

  function exitWithoutSaving() {
    if (onCancel) onCancel();
    else router.push("/ad-accounts");
  }

  function handleDiscard() {
    if (isDirty) {
      setDiscardDialogOpen(true);
    } else {
      exitWithoutSaving();
    }
  }

  function handleConfirmDiscard() {
    exitWithoutSaving();
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const adLevelSelected = values.levels.includes("AD");
  const campaignLevelSelected = values.levels.includes("CAMPAIGN");

  const enabledLabel = values.enabled
    ? "Syncing is active"
    : "Syncing is paused";
  const enabledDescription = values.enabled
    ? "This account will sync data on schedule and can be triggered manually."
    : "This account will not run automatically. You can still trigger it manually.";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <UnsavedChangesGuard
        isDirty={isDirty}
        onConfirmDiscard={handleConfirmDiscard}
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative space-y-8 pb-24"
        aria-label={mode === "new" ? "Create Ad Account" : "Edit Ad Account"}
      >
        {/* ── Save error banner ─────────────────────────────────────────── */}
        {saveError && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-3 rounded-xl border p-4 text-sm"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Failed to save</p>
              <p className="mt-0.5 text-xs">{saveError}</p>
            </div>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="hover:bg-destructive/10 ml-auto rounded p-0.5"
              aria-label="Dismiss error"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        )}

        {/* ── Enabled toggle ────────────────────────────────────────────── */}
        <div
          className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
            values.enabled
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-muted/30"
          }`}
        >
          <Switch
            id="enabled-toggle"
            checked={values.enabled}
            onCheckedChange={(checked) => setField("enabled", checked)}
            aria-describedby="enabled-description"
          />
          <div className="flex-1">
            <label
              htmlFor="enabled-toggle"
              className="cursor-pointer text-sm font-semibold"
            >
              {enabledLabel}
            </label>
            <p
              id="enabled-description"
              className="text-muted-foreground mt-0.5 text-xs"
            >
              {enabledDescription}
            </p>
          </div>
        </div>

        {/* ── Section 1: Account Identity ───────────────────────────────── */}
        <FormSection
          title="Account Identity"
          description="Name this configuration and link your Facebook Ad Account."
          Icon={UserIcon}
        >
          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="account-label">
              Label
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="account-label"
              type="text"
              placeholder="e.g. Brand Awareness — UZ"
              value={values.label}
              maxLength={60}
              onChange={(e) => setField("label", e.target.value)}
              onBlur={() => blurField("label")}
              aria-required="true"
              aria-invalid={!!getError("label")}
              aria-describedby={
                getError("label") ? "label-error" : "label-hint"
              }
            />
            <div className="flex items-center justify-between">
              {getError("label") ? (
                <p
                  id="label-error"
                  role="alert"
                  aria-live="polite"
                  className="text-destructive flex items-center gap-1.5 text-xs"
                >
                  <span aria-hidden="true">&#x26A0;</span>
                  {getError("label")}
                </p>
              ) : (
                <p id="label-hint" className="text-muted-foreground text-xs">
                  A short name for your own reference
                </p>
              )}
              <span className="text-muted-foreground ml-auto text-xs">
                {values.label.length}/60
              </span>
            </div>
          </div>

          {/* FB Account Picker */}
          <div className="space-y-1.5">
            <Label>
              Facebook Ad Account
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            </Label>
            <FbAccountPicker
              accounts={fbAccounts ?? []}
              value={values.fbAccountId}
              onChange={(id) => setField("fbAccountId", id)}
              onBlur={() => blurField("fbAccountId")}
              error={getError("fbAccountId")}
              loading={fbLoading}
            />
          </div>
        </FormSection>

        {/* ── Section 2: Data to Sync ───────────────────────────────────── */}
        <FormSection
          title="Data to Sync"
          description="Choose which levels and metrics to pull from Facebook Insights."
          Icon={FacebookIcon}
          tileBg="bg-fb-blue/10"
          iconColor="text-fb-blue"
        >
          {/* Levels */}
          <div className="space-y-1.5">
            <Label>
              Sync levels
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            </Label>
            <LevelCheckboxes
              value={values.levels}
              onChange={(levels) => setField("levels", levels)}
              onBlur={() => blurField("levels")}
              error={getError("levels")}
            />
          </div>

          {/* Metrics */}
          <div className="space-y-1.5">
            <Label>
              Metrics
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            </Label>
            <MetricsMultiSelect
              value={values.metrics}
              onChange={(metrics) => setField("metrics", metrics)}
              onBlur={() => blurField("metrics")}
              error={getError("metrics")}
            />
            <p className="text-muted-foreground text-xs">
              Grouped by Delivery, Cost, Conversion, Video. At least one
              required.
            </p>
          </div>

          {/* Date window */}
          <div className="space-y-1.5">
            <Label>Date window</Label>
            <DateWindowSlider
              value={values.dateWindowDays}
              onChange={(days) => setField("dateWindowDays", days)}
              onBlur={() => blurField("dateWindowDays")}
            />
          </div>
        </FormSection>

        {/* ── Section 3: Destination ────────────────────────────────────── */}
        <FormSection
          title="Destination"
          description="Configure the Google Sheets spreadsheet where data will be written."
          Icon={GoogleSheetsIcon}
          tileBg="bg-sheets-green/10"
          iconColor="text-sheets-green"
        >
          {/* Spreadsheet ID */}
          <div className="space-y-1.5">
            <Label htmlFor="spreadsheet-id">
              Spreadsheet ID
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            </Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <FileSpreadsheetIcon className="size-4 text-green-600" />
              </InputGroupAddon>
              <InputGroupInput
                id="spreadsheet-id"
                type="text"
                placeholder="Paste Google Sheets ID or URL"
                value={values.spreadsheetId}
                onChange={(e) => setField("spreadsheetId", e.target.value)}
                onBlur={() => blurField("spreadsheetId")}
                aria-required="true"
                aria-invalid={!!getError("spreadsheetId")}
                aria-describedby={
                  getError("spreadsheetId") ? "spreadsheet-error" : undefined
                }
              />
            </InputGroup>
            {getError("spreadsheetId") ? (
              <p
                id="spreadsheet-error"
                role="alert"
                aria-live="polite"
                className="text-destructive flex items-center gap-1.5 text-xs"
              >
                <span aria-hidden="true">&#x26A0;</span>
                {getError("spreadsheetId")}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Found in the Sheets URL:{" "}
                <code className="font-mono text-xs">/spreadsheets/d/[ID]/</code>
              </p>
            )}
          </div>

          {/* Campaign tab name — always shown when CAMPAIGN level selected */}
          <div
            className={`overflow-hidden transition-all duration-150 ${
              campaignLevelSelected
                ? "max-h-32 opacity-100"
                : "max-h-0 opacity-0"
            }`}
            aria-hidden={!campaignLevelSelected}
          >
            <div className="space-y-1.5 pt-0">
              <Label htmlFor="campaign-tab">Campaign tab name</Label>
              <Input
                id="campaign-tab"
                type="text"
                placeholder="Campaigns"
                value={values.campaignTabName}
                onChange={(e) => setField("campaignTabName", e.target.value)}
                onBlur={() => blurField("campaignTabName")}
                tabIndex={campaignLevelSelected ? 0 : -1}
                aria-invalid={!!getError("campaignTabName")}
                aria-describedby={
                  getError("campaignTabName") ? "campaign-tab-error" : undefined
                }
              />
              {getError("campaignTabName") && (
                <p
                  id="campaign-tab-error"
                  role="alert"
                  aria-live="polite"
                  className="text-destructive flex items-center gap-1.5 text-xs"
                >
                  <span aria-hidden="true">&#x26A0;</span>
                  {getError("campaignTabName")}
                </p>
              )}
            </div>
          </div>

          {/* Ad tab name — only shown when AD level selected */}
          <div
            className={`overflow-hidden transition-all duration-150 ${
              adLevelSelected ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!adLevelSelected}
          >
            <div className="space-y-1.5 pt-0">
              <Label htmlFor="ad-tab">Ad tab name</Label>
              <Input
                id="ad-tab"
                type="text"
                placeholder="Ads"
                value={values.adTabName}
                onChange={(e) => setField("adTabName", e.target.value)}
                onBlur={() => blurField("adTabName")}
                tabIndex={adLevelSelected ? 0 : -1}
                aria-invalid={!!getError("adTabName")}
                aria-describedby={
                  getError("adTabName") ? "ad-tab-error" : undefined
                }
              />
              {getError("adTabName") && (
                <p
                  id="ad-tab-error"
                  role="alert"
                  aria-live="polite"
                  className="text-destructive flex items-center gap-1.5 text-xs"
                >
                  <span aria-hidden="true">&#x26A0;</span>
                  {getError("adTabName")}
                </p>
              )}
            </div>
          </div>
        </FormSection>

        {/* ── Section 4: Schedule ───────────────────────────────────────── */}
        <FormSection
          title="Schedule"
          description="Set when this account should automatically sync data."
          Icon={ClockIcon}
        >
          <CronBuilder
            cronExpression={values.cronExpression}
            timezone={values.timezone}
            onCronChange={(cron) => setField("cronExpression", cron)}
            onTimezoneChange={(tz) => setField("timezone", tz)}
            onBlur={() => {
              blurField("cronExpression");
              blurField("timezone");
            }}
          />
        </FormSection>

        {/* ── Sticky footer ─────────────────────────────────────────────── */}
        <div className="border-border bg-background/95 fixed right-0 bottom-0 left-0 z-40 border-t shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-sm supports-backdrop-filter:backdrop-blur-sm md:left-[240px]">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-8">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              {isDirty && (
                <span className="flex items-center gap-1">
                  <span className="bg-status-warning inline-block size-1.5 rounded-full" />
                  Unsaved changes
                </span>
              )}
              {!isDirty && submitAttempted && (
                <span className="text-status-success">All changes saved</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscard}
                disabled={isSaving}
              >
                <XIcon />
                Discard
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RotateCcwIcon className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    {mode === "new" ? "Create account" : "Save changes"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

// ─── Export the skeleton so pages can use it ─────────────────────────────────
export { FormSkeleton };
