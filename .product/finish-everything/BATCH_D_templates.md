# Batch D — Scenario template picker on /scenarios/new

**You are Codex.** Working dir: `C:\Users\saman\OneDrive\Documents\data-365-projects\automation`. Branch `phase-a-foundation`. Don't commit, don't push.

## Read first

- `CLAUDE.md`
- `.product/finish-everything/PLAN.md`
- `src/lib/scenario-templates.ts` — the template catalog (already exists)
- `src/server/api/routers/modules.ts` — has a `listTemplates` query returning `SerializableTemplate[]`
- `src/app/(dashboard)/scenarios/new/page.tsx` and its client component
- `src/app/(dashboard)/scenarios/new/NewScenarioClient.tsx` (the wrapper that mounts ScenarioBuilder)

## Scope (P2)

The scenario template catalog already exists in code with several pre-built templates (campaign-insights → sheets, ad-insights → sheets, manual pull). The factory is on the server (`scenario-templates.ts`'s `factory(...)` produces draft steps). The tRPC query `modules.listTemplates` already returns serializable metadata. **What's missing:** the entry-point UI on `/scenarios/new` that lists templates and lets the user pick one to pre-fill the builder.

Goal: when the user lands on `/scenarios/new`, show a top section with template cards. Clicking a template pre-fills `ScenarioBuilder`'s `initialName` + `initialSteps`. A "Start from scratch" card sits last in the row.

---

## 1. New `TemplatePicker` component

**Create:** `src/components/scenarios/TemplatePicker.tsx`

```tsx
"use client";

import * as React from "react";
import { LayoutTemplateIcon, ChevronRightIcon, FilePlus2Icon } from "lucide-react";
import { cn } from "~/lib/utils";

export interface TemplatePickerOption {
  id: string;
  name: string;
  description: string;
}

interface TemplatePickerProps {
  templates: TemplatePickerOption[];
  isLoading?: boolean;
  onPickTemplate: (templateId: string) => void;
  onStartScratch: () => void;
}

export function TemplatePicker({
  templates,
  isLoading,
  onPickTemplate,
  onStartScratch,
}: TemplatePickerProps) {
  return (
    <section
      className="mx-auto max-w-3xl px-4 pt-6"
      aria-labelledby="template-picker-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <LayoutTemplateIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="template-picker-heading" className="text-base text-foreground">
          Start from a template
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[112px] rounded-xl border border-border bg-muted/20 motion-safe:animate-pulse motion-reduce:opacity-70"
              />
            ))
          : templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onPickTemplate(tpl.id)}
                className={cn(
                  "group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left",
                  "transition-colors hover:border-primary/40 hover:bg-primary/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="text-sm font-medium text-foreground">{tpl.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {tpl.description}
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary">
                  Use template
                  <ChevronRightIcon className="size-3" />
                </span>
              </button>
            ))}

        {!isLoading && (
          <button
            type="button"
            onClick={onStartScratch}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border border-dashed border-border bg-muted/10 p-4 text-left",
              "transition-colors hover:border-primary/40 hover:bg-primary/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <FilePlus2Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">Blank scenario</span>
            <span className="text-xs text-muted-foreground">
              Start with an empty trigger; pick everything yourself.
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
```

## 2. Server: expose template factory output

**File:** `src/server/api/routers/modules.ts`

Find `listTemplates` — it returns serializable metadata only (no factory). Add a sibling procedure that runs the factory for a single template ID and returns the resulting draft steps + name. The factory currently lives on the server in `src/lib/scenario-templates.ts`.

```ts
getTemplate: publicProcedure
  .input(z.object({ templateId: z.string() }))
  .query(({ input }) => {
    const tpl = SCENARIO_TEMPLATES.find((t) => t.id === input.templateId);
    if (!tpl) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
    }
    const steps = tpl.factory(); // produces DraftStep[]
    return {
      id: tpl.id,
      name: tpl.name,
      steps: steps.map((s) => ({
        position: s.position,
        moduleType: s.moduleType,
        config: s.config,
      })),
    };
  }),
```

Imports: ensure `SCENARIO_TEMPLATES` and `TRPCError` are in scope. Check existing import patterns in the file.

## 3. NewScenarioClient integration

**File:** `src/app/(dashboard)/scenarios/new/NewScenarioClient.tsx`

Currently it mounts `<ScenarioBuilder />` directly. Change to:

a) Local state `chosen` — null when user hasn't decided yet, `{ name, steps }` once a template (or "scratch") is picked.

b) When `chosen === null`, render `<TemplatePicker />` (mount the picker; pass `templates` from `api.modules.listTemplates.useQuery()`).

c) Once a template is picked, fire `api.modules.getTemplate.useQuery(...)` lazily (or imperative call) and set `chosen` to the resulting `{ name, steps }`. For the blank-scenario button, set `chosen` to `{ name: "", steps: [] }` directly.

d) When `chosen !== null`, render `<ScenarioBuilder initialName={chosen.name} initialSteps={chosen.steps} />`.

e) The URL doesn't need to change between states. Don't add a query param. The whole choice is in-memory.

Sketch:

```tsx
"use client";

import * as React from "react";
import { TemplatePicker } from "~/components/scenarios/TemplatePicker";
import { ScenarioBuilder, type DraftStep } from "~/components/scenarios/builder/ScenarioBuilder";
import { api } from "~/trpc/react";
import { toast } from "sonner";

export function NewScenarioClient() {
  const [chosen, setChosen] = React.useState<
    { name: string; steps: DraftStep[] } | null
  >(null);
  const templatesQ = api.modules.listTemplates.useQuery();
  const utils = api.useUtils();

  async function pickTemplate(templateId: string) {
    try {
      const tpl = await utils.modules.getTemplate.fetch({ templateId });
      // Coerce server-shape steps to DraftStep — add stable ids
      const steps: DraftStep[] = tpl.steps.map((s, idx) => ({
        id: `draft_template_${templateId}_${idx}`,
        position: s.position,
        moduleType: s.moduleType,
        config: s.config as Record<string, unknown>,
      }));
      setChosen({ name: tpl.name, steps });
    } catch (e) {
      toast.error(
        `Couldn't load template: ${e instanceof Error ? e.message : "unknown"}`,
      );
    }
  }

  function startScratch() {
    setChosen({ name: "", steps: [] });
  }

  if (chosen === null) {
    return (
      <TemplatePicker
        templates={(templatesQ.data ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
        }))}
        isLoading={templatesQ.isPending}
        onPickTemplate={pickTemplate}
        onStartScratch={startScratch}
      />
    );
  }

  return <ScenarioBuilder initialName={chosen.name} initialSteps={chosen.steps} />;
}
```

If `DraftStep` isn't exported from `ScenarioBuilder.tsx`, export it there (just add `export` to the existing type/interface declaration).

## 4. ID stability (hydration safety)

**IMPORTANT:** never call `Date.now()`, `Math.random()`, or `crypto.randomUUID()` inside `useMemo`, lazy `useState` init, or render bodies. The `draft_template_${templateId}_${idx}` pattern above is stable and SSR-safe.

If `ScenarioBuilder`'s initial step IDs use any randomness, you don't need to touch it — your IDs are passed via `initialSteps` and `ScenarioBuilder` should use them as-is.

## 5. Tests

Add a basic test for `getTemplate`:
- Returns the expected step count + module types for at least one known template ID.
- Throws NOT_FOUND for a bogus ID.

---

## Verification gate

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm tsx --conditions react-server scripts/verify-canonical.ts
```

All must be:
- typecheck: exit 0
- lint: 0 warnings/errors
- test: ≥75/75
- probe: 23/23

Manual smoke (the dev server is on http://localhost:3000):
- Visit `/scenarios/new` → template picker renders with 3 templates + Blank card
- Click a template → builder mounts pre-filled
- Click Blank → builder mounts empty
- No console errors, no hydration warnings

---

## Report back

- Files created / modified (paths)
- Gate results
- Whether `DraftStep` was already exported or you exported it
- Deviations
