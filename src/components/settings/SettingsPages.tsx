"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { Download, KeyRound, LogOut, Trash2, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  SettingsEmpty,
  SettingsError,
  SettingsPanel,
  SettingsSkeleton,
} from "./SettingsState";
import { TypedConfirmDialog } from "./TypedConfirmDialog";
import { useSettingsAutosave } from "./useSettingsAutosave";
import { api, type RouterOutputs } from "~/trpc/react";

type SettingsUser = RouterOutputs["settings"]["get"];

const timezones = ["Asia/Tashkent", "UTC", "America/New_York", "Europe/London"];
const weekdays = [
  ["0", "Sunday"],
  ["1", "Monday"],
  ["6", "Saturday"],
] as const;

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/[\s@.]+/)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function QueryState({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  rows,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  rows?: number;
  children: React.ReactNode;
}) {
  if (isLoading) return <SettingsSkeleton label="Loading settings" rows={rows} />;
  if (isError) return <SettingsError onRetry={onRetry} />;
  if (isEmpty) return <SettingsEmpty />;
  return <>{children}</>;
}

function Field({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-900">{label}</label>
      {children}
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {children}
    </select>
  );
}

export function ProfileSettingsPage() {
  const query = api.settings.get.useQuery();

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={!query.data}
      onRetry={() => void query.refetch()}
      rows={2}
    >
      {query.data ? <ProfileSuccess user={query.data} /> : null}
    </QueryState>
  );
}

function ProfileSuccess({ user }: { user: SettingsUser }) {
  const name = user.name || "User";

  return (
    <SettingsPanel>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {user.image ? <AvatarImage src={user.image} alt={name} /> : null}
            <AvatarFallback>{initials(name, user.email)}</AvatarFallback>
          </Avatar>
          <dl className="space-y-1">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
                Name
              </dt>
              <dd className="text-sm font-medium text-slate-900">{name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
                Email
              </dt>
              <dd className="break-all text-sm text-slate-700">{user.email}</dd>
            </div>
          </dl>
        </div>
        <Button
          variant="outline"
          onClick={() => void signOut({ callbackUrl: "/login" })}
          className="min-h-11 self-start"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </SettingsPanel>
  );
}

export function WorkspaceSettingsPage() {
  const profile = api.settings.get.useQuery();
  const settings = api.userSettings.get.useQuery();
  const updateSettings = api.userSettings.update.useMutation();
  const updateTimezone = api.settings.updateTimezone.useMutation();
  const [draft, setDraft] = React.useState({
    displayName: "",
    weekStartsOn: "1",
    timezone: "Asia/Tashkent",
  });

  React.useEffect(() => {
    if (!settings.data || !profile.data) return;
    setDraft({
      displayName: settings.data.displayName ?? "",
      weekStartsOn: String(settings.data.weekStartsOn),
      timezone: profile.data.timezone,
    });
  }, [profile.data, settings.data]);

  const save = React.useCallback(
    async (value: typeof draft) => {
      await Promise.all([
        updateSettings.mutateAsync({
          displayName: value.displayName || null,
          weekStartsOn: Number(value.weekStartsOn),
        }),
        updateTimezone.mutateAsync({ timezone: value.timezone }),
      ]);
    },
    [updateSettings, updateTimezone],
  );

  useSettingsAutosave({
    value: draft,
    enabled: Boolean(profile.data && settings.data),
    save,
  });

  const isLoading = profile.isLoading || settings.isLoading;
  const isError = profile.isError || settings.isError;

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      isEmpty={!profile.data || !settings.data}
      onRetry={() => {
        void profile.refetch();
        void settings.refetch();
      }}
    >
      <SettingsPanel>
        <div className="grid gap-5">
          <Field label="Display name">
            <Input
              value={draft.displayName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              className="min-h-11"
            />
          </Field>
          <Field label="Week starts on">
            <NativeSelect
              ariaLabel="Week starts on"
              value={draft.weekStartsOn}
              onChange={(value) =>
                setDraft((current) => ({ ...current, weekStartsOn: value }))
              }
            >
              {weekdays.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Timezone">
            <NativeSelect
              ariaLabel="Timezone"
              value={draft.timezone}
              onChange={(value) =>
                setDraft((current) => ({ ...current, timezone: value }))
              }
            >
              {timezones.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Locale">
            <p className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              English (United States)
            </p>
          </Field>
        </div>
      </SettingsPanel>
    </QueryState>
  );
}

export function AccessSettingsPage({ allowedEmails }: { allowedEmails: string[] }) {
  const query = api.settings.get.useQuery();

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={!query.data}
      onRetry={() => void query.refetch()}
      rows={2}
    >
      <SettingsPanel>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {allowedEmails.length > 0 ? (
              allowedEmails.map((email) => (
                <span
                  key={email}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                >
                  {email}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No allowlist configured.</span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Edit <span className="font-medium text-slate-700">.env</span> to change allowed emails.
          </p>
        </div>
      </SettingsPanel>
    </QueryState>
  );
}

export function TokensSettingsPage({
  tokenSuffix,
}: {
  tokenSuffix: string | null;
}) {
  const query = api.settings.get.useQuery();

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={!query.data}
      onRetry={() => void query.refetch()}
      rows={2}
    >
      <SettingsPanel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">TOKEN_ENC_KEY</p>
            <p className="mt-1 text-sm text-slate-500">
              {tokenSuffix ? `Set, ending in ${tokenSuffix}` : "Not set"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" disabled className="min-h-11 self-start" />
              }
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Rotate
            </TooltipTrigger>
            <TooltipContent>Implementation pending Phase 5</TooltipContent>
          </Tooltip>
        </div>
      </SettingsPanel>
    </QueryState>
  );
}

export function NotificationsSettingsPage() {
  const query = api.userSettings.get.useQuery();
  const update = api.userSettings.update.useMutation();
  const [draft, setDraft] = React.useState({
    emailOnFailure: false,
    genericWebhookUrl: "",
    quietHoursStart: "",
    quietHoursEnd: "",
  });

  React.useEffect(() => {
    if (!query.data) return;
    setDraft({
      emailOnFailure: query.data.emailOnFailure,
      genericWebhookUrl: query.data.genericWebhookUrl ?? "",
      quietHoursStart: query.data.quietHoursStart ?? "",
      quietHoursEnd: query.data.quietHoursEnd ?? "",
    });
  }, [query.data]);

  const save = React.useCallback(
    (value: typeof draft) =>
      update.mutateAsync({
        emailOnFailure: value.emailOnFailure,
        genericWebhookUrl: value.genericWebhookUrl || null,
        quietHoursStart: value.quietHoursStart || null,
        quietHoursEnd: value.quietHoursEnd || null,
      }),
    [update],
  );

  useSettingsAutosave({ value: draft, enabled: Boolean(query.data), save });

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={!query.data}
      onRetry={() => void query.refetch()}
      rows={5}
    >
      <SettingsPanel>
        <div className="grid gap-5">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Email on failure</p>
              <p className="text-sm text-slate-500">Send an email when a run fails.</p>
            </div>
            <Switch
              checked={draft.emailOnFailure}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, emailOnFailure: checked }))
              }
              aria-label="Email on failure"
            />
          </div>
          <Field label="Generic webhook URL">
            <Input
              value={draft.genericWebhookUrl}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  genericWebhookUrl: event.target.value,
                }))
              }
              className="min-h-11"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quiet hours start">
              <Input
                type="time"
                value={draft.quietHoursStart}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    quietHoursStart: event.target.value,
                  }))
                }
                className="min-h-11"
              />
            </Field>
            <Field label="Quiet hours end">
              <Input
                type="time"
                value={draft.quietHoursEnd}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    quietHoursEnd: event.target.value,
                  }))
                }
                className="min-h-11"
              />
            </Field>
          </div>
        </div>
      </SettingsPanel>
    </QueryState>
  );
}

export function SchedulesSettingsPage() {
  const query = api.userSettings.get.useQuery();
  const update = api.userSettings.update.useMutation();
  const [draft, setDraft] = React.useState({ schedulesPaused: false });

  React.useEffect(() => {
    if (!query.data) return;
    setDraft({ schedulesPaused: query.data.schedulesPaused });
  }, [query.data]);

  const save = React.useCallback(
    (value: typeof draft) => update.mutateAsync(value),
    [update],
  );

  useSettingsAutosave({ value: draft, enabled: Boolean(query.data), save });

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={!query.data}
      onRetry={() => void query.refetch()}
      rows={2}
    >
      <SettingsPanel>
        <div className="space-y-5">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Pause schedules</p>
              <p className="text-sm text-slate-500">Manual runs remain available.</p>
            </div>
            <Switch
              checked={draft.schedulesPaused}
              onCheckedChange={(checked) =>
                setDraft({ schedulesPaused: checked })
              }
              aria-label="Pause schedules"
            />
          </div>
          <p className="text-sm text-slate-500">
            Default timezone is managed from the Workspace tab.
          </p>
        </div>
      </SettingsPanel>
    </QueryState>
  );
}

export function IntegrationsSettingsPage({
  bitrixBaseUrl,
}: {
  bitrixBaseUrl: string | null;
}) {
  const query = api.userSettings.get.useQuery();
  const update = api.userSettings.update.useMutation();
  const [draft, setDraft] = React.useState({
    defaultAdAccountBehavior: "",
    defaultSheetTemplate: "",
  });

  React.useEffect(() => {
    if (!query.data) return;
    setDraft({
      defaultAdAccountBehavior: query.data.defaultAdAccountBehavior ?? "",
      defaultSheetTemplate: query.data.defaultSheetTemplate ?? "",
    });
  }, [query.data]);

  const save = React.useCallback(
    (value: typeof draft) =>
      update.mutateAsync({
        defaultAdAccountBehavior: value.defaultAdAccountBehavior || null,
        defaultSheetTemplate: value.defaultSheetTemplate || null,
      }),
    [update],
  );

  useSettingsAutosave({ value: draft, enabled: Boolean(query.data), save });

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={!query.data}
      onRetry={() => void query.refetch()}
      rows={3}
    >
      <SettingsPanel>
        <div className="grid gap-5">
          <Field label="Default ad account behavior">
            <Input
              value={draft.defaultAdAccountBehavior}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultAdAccountBehavior: event.target.value,
                }))
              }
              className="min-h-11"
            />
          </Field>
          <Field label="Default sheet template">
            <Input
              value={draft.defaultSheetTemplate}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultSheetTemplate: event.target.value,
                }))
              }
              className="min-h-11"
            />
          </Field>
          <Field label="Bitrix24 base URL">
            <p className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {bitrixBaseUrl ?? "Not configured"}
            </p>
          </Field>
        </div>
      </SettingsPanel>
    </QueryState>
  );
}

export function DangerSettingsPage() {
  const query = api.settings.get.useQuery();
  const userSettings = api.userSettings.get.useQuery();
  const utils = api.useUtils();
  const resetRuns = api.settings.resetRuns.useMutation();
  const disconnectAll = api.connections.disconnectAll.useMutation();
  const deleteAccount = api.settings.deleteAccount.useMutation();
  const [dialog, setDialog] = React.useState<
    "reset" | "disconnect" | "delete" | null
  >(null);

  async function downloadExport() {
    try {
      const data = await utils.settings.exportData.fetch();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "adsync-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export data");
    }
  }

  return (
    <QueryState
      isLoading={query.isLoading || userSettings.isLoading}
      isError={query.isError || userSettings.isError}
      isEmpty={!query.data || !userSettings.data}
      onRetry={() => {
        void query.refetch();
        void userSettings.refetch();
      }}
      rows={4}
    >
      <SettingsPanel>
        <div className="grid gap-3">
          <DangerAction
            title="Export data"
            description="Download scenarios and runs as JSON."
            icon={<Download className="size-4" aria-hidden="true" />}
            label="Export"
            onClick={() => void downloadExport()}
          />
          <DangerAction
            title="Reset all runs"
            description="Delete run history for this account."
            icon={<Trash2 className="size-4" aria-hidden="true" />}
            label="Reset"
            onClick={() => setDialog("reset")}
          />
          <DangerAction
            title="Disconnect all OAuth"
            description="Remove every saved OAuth connection."
            icon={<Unplug className="size-4" aria-hidden="true" />}
            label="Disconnect"
            onClick={() => setDialog("disconnect")}
          />
          <DangerAction
            title="Delete account"
            description="Delete your user row and cascaded account data."
            icon={<Trash2 className="size-4" aria-hidden="true" />}
            label="Delete"
            onClick={() => setDialog("delete")}
          />
        </div>
      </SettingsPanel>
      <TypedConfirmDialog
        open={dialog === "reset"}
        onOpenChange={(open) => setDialog(open ? "reset" : null)}
        title="Reset all runs"
        description="This deletes run history for your account."
        expected="reset"
        actionLabel="Reset runs"
        pending={resetRuns.isPending}
        onConfirm={() =>
          resetRuns.mutate(undefined, {
            onSuccess: () => {
              setDialog(null);
              toast.success("Runs reset");
            },
            onError: () => toast.error("Could not reset runs"),
          })
        }
      />
      <TypedConfirmDialog
        open={dialog === "disconnect"}
        onOpenChange={(open) => setDialog(open ? "disconnect" : null)}
        title="Disconnect all OAuth"
        description="This removes all connected OAuth providers."
        expected="disconnect"
        actionLabel="Disconnect all"
        pending={disconnectAll.isPending}
        onConfirm={() =>
          disconnectAll.mutate(undefined, {
            onSuccess: () => {
              setDialog(null);
              toast.success("Connections removed");
            },
            onError: () => toast.error("Could not disconnect connections"),
          })
        }
      />
      <TypedConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Delete account"
        description="This deletes your account and cascaded data."
        expected={userSettings.data?.displayName ?? query.data?.name ?? "User"}
        actionLabel="Delete account"
        pending={deleteAccount.isPending}
        onConfirm={() =>
          deleteAccount.mutate(undefined, {
            onSuccess: () => void signOut({ callbackUrl: "/login" }),
            onError: () => toast.error("Could not delete account"),
          })
        }
      />
    </QueryState>
  );
}

function DangerAction({
  title,
  description,
  icon,
  label,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <Button
        variant={label === "Export" ? "outline" : "destructive"}
        onClick={onClick}
        className="min-h-11 self-start"
      >
        {icon}
        {label}
      </Button>
    </div>
  );
}

export function AboutSettingsPage({
  version,
  commitSha,
  deploymentId,
}: {
  version: string;
  commitSha: string;
  deploymentId: string;
}) {
  const query = api.settings.get.useQuery();

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={!query.data}
      onRetry={() => void query.refetch()}
      rows={3}
    >
      <SettingsPanel>
        <dl className="grid gap-4 text-sm">
          <InfoRow label="Version" value={version} />
          <InfoRow label="Commit" value={commitSha} />
          <InfoRow label="Deployment" value={deploymentId} />
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-medium text-slate-900">Repository</dt>
            <dd>
              <a
                href="https://github.com/data365-git/adsync"
                className="break-all text-sky-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
              >
                https://github.com/data365-git/adsync
              </a>
            </dd>
          </div>
        </dl>
      </SettingsPanel>
    </QueryState>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <dt className="font-medium text-slate-900">{label}</dt>
      <dd className="break-all text-slate-600">{value}</dd>
    </div>
  );
}
