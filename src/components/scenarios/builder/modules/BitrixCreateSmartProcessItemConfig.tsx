"use client";

import * as React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { FieldMappingPicker } from "./FieldMappingPicker";
import { getModule } from "~/lib/modules";
import type { ModuleType } from "~/server/mocks/types";

interface BitrixCreateSmartProcessItemConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  prevStepModuleType?: ModuleType;
}

export function BitrixCreateSmartProcessItemConfig({
  config,
  onChange,
  errors,
  prevStepModuleType,
}: BitrixCreateSmartProcessItemConfigProps) {
  const entityTypeId = typeof config.entityTypeId === "string" ? config.entityTypeId : "";
  const title = typeof config.title === "string" ? config.title : "";
  const stageId = typeof config.stageId === "string" ? config.stageId : "";
  const fields = Array.isArray(config.fields) ? (config.fields as string[]) : [];

  const availableFields = React.useMemo(() => {
    if (!prevStepModuleType) return [];
    const mod = getModule(prevStepModuleType);
    if (!mod || mod.sampleOutput.length === 0) return [];
    return Object.keys(mod.sampleOutput[0] ?? {});
  }, [prevStepModuleType]);

  return (
    <div className="space-y-4">
      {/* Entity type ID */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-spi-entity">
          Entity type ID
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          The dynamic entity type ID for your Smart Process. Find it in CRM → Smart Processes settings.
        </p>
        <Input
          id="bitrix-spi-entity"
          type="text"
          placeholder="183"
          value={entityTypeId}
          onChange={(e) => onChange({ ...config, entityTypeId: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.entityTypeId}
        />
        {errors?.entityTypeId && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.entityTypeId}
          </p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-spi-title">
          Title
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Title for the new item
        </p>
        <Input
          id="bitrix-spi-title"
          type="text"
          placeholder="New item title"
          value={title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          aria-required="true"
          aria-invalid={!!errors?.title}
        />
        {errors?.title && (
          <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs text-destructive">
            <span aria-hidden="true">&#x26A0;</span>
            {errors.title}
          </p>
        )}
      </div>

      {/* Stage ID */}
      <div className="space-y-1.5">
        <Label htmlFor="bitrix-spi-stage">Stage ID</Label>
        <Input
          id="bitrix-spi-stage"
          type="text"
          placeholder="DT183_1:NEW"
          value={stageId}
          onChange={(e) => onChange({ ...config, stageId: e.target.value })}
        />
      </div>

      {/* Additional fields (FieldMappingPicker — optional) */}
      <div className="space-y-1.5">
        <Label>Additional fields</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Map extra custom fields. Keys are Bitrix24 field API names.
        </p>
        <FieldMappingPicker
          availableFields={availableFields}
          value={fields}
          onChange={(f) => onChange({ ...config, fields: f })}
          error={errors?.fields}
        />
      </div>

      {/* Info notice */}
      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        Smart Process Items are Bitrix24&apos;s flexible custom CRM entity primitive. They extend
        beyond standard leads and deals with custom fields and workflows.
      </div>
    </div>
  );
}
