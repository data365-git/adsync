"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { BitrixPortalSelector } from "./BitrixPortalSelector";

interface BitrixCreateDealConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export function BitrixCreateDealConfig({
  config,
  onChange,
  errors,
}: BitrixCreateDealConfigProps) {
  const portalId = typeof config.portalId === "string" ? config.portalId : "";
  const title = typeof config.title === "string" ? config.title : "";
  const categoryId = typeof config.categoryId === "string" ? config.categoryId : "";
  const stageId = typeof config.stageId === "string" ? config.stageId : "";
  const opportunity =
    typeof config.opportunity === "number" ? config.opportunity : "";
  const currency = typeof config.currency === "string" ? config.currency : "";

  const categoriesQ = api.connections.listBitrixDealCategories.useQuery(
    { portalId },
    { enabled: portalId.length > 0, staleTime: 60_000 },
  );
  const stagesQ = api.connections.listBitrixDealStages.useQuery(
    { portalId, categoryId },
    { enabled: portalId.length > 0 && categoryId.length > 0, staleTime: 60_000 },
  );

  return (
    <div className="space-y-4">
      <BitrixPortalSelector
        value={portalId}
        onChange={(v) =>
          onChange({ ...config, portalId: v, categoryId: "", stageId: "" })
        }
        error={errors?.portalId}
        id="bitrix-deal-portal"
      />

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-deal-title">
          Deal title
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="bitrix-deal-title"
          type="text"
          placeholder="Lead from {{name}}"
          value={title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          aria-invalid={!!errors?.title}
        />
        {errors?.title && (
          <p role="alert" className="text-xs text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      {/* Pipeline + Stage — pulled live from the selected portal */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-category">
            Pipeline
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <Select
            value={categoryId}
            disabled={!portalId || categoriesQ.isLoading}
            onValueChange={(v) => {
              if (v) onChange({ ...config, categoryId: v, stageId: "" });
            }}
          >
            <SelectTrigger id="bitrix-deal-category" className="w-full" aria-invalid={!!errors?.categoryId}>
              <SelectValue
                placeholder={
                  !portalId
                    ? "Pick a portal first"
                    : categoriesQ.isLoading
                      ? "Loading…"
                      : "Select pipeline"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categoriesQ.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.categoryId && (
            <p role="alert" className="text-xs text-destructive">
              {errors.categoryId}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-stage">
            Stage
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <Select
            value={stageId}
            disabled={!categoryId || stagesQ.isLoading}
            onValueChange={(v) => {
              if (v) onChange({ ...config, stageId: v });
            }}
          >
            <SelectTrigger id="bitrix-deal-stage" className="w-full" aria-invalid={!!errors?.stageId}>
              <SelectValue
                placeholder={
                  !categoryId
                    ? "Pick a pipeline first"
                    : stagesQ.isLoading
                      ? "Loading…"
                      : "Select stage"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {stagesQ.data?.map((s) => (
                <SelectItem key={s.statusId} value={s.statusId}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.stageId && (
            <p role="alert" className="text-xs text-destructive">
              {errors.stageId}
            </p>
          )}
        </div>
      </div>

      {/* Amount + currency (optional) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-amount">Deal amount</Label>
          <Input
            id="bitrix-deal-amount"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={opportunity === "" ? "" : opportunity}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                onChange({ ...config, opportunity: val });
              } else {
                onChange(
                  Object.fromEntries(
                    Object.entries(config).filter(([k]) => k !== "opportunity"),
                  ),
                );
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bitrix-deal-currency">Currency</Label>
          <Input
            id="bitrix-deal-currency"
            type="text"
            maxLength={3}
            placeholder="USD"
            value={currency}
            onChange={(e) => onChange({ ...config, currency: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
