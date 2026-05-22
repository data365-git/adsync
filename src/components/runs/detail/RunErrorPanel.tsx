import { AlertCircle } from "lucide-react";

interface RunErrorPanelProps {
  errorMessage: string;
}

export function RunErrorPanel({ errorMessage }: RunErrorPanelProps) {
  // Extract a one-line summary: first sentence or first 120 chars
  const firstPeriod = errorMessage.indexOf(".");
  const summary =
    firstPeriod !== -1 && firstPeriod < 120
      ? errorMessage.slice(0, firstPeriod + 1)
      : errorMessage.slice(0, 120) + (errorMessage.length > 120 ? "…" : "");

  const hasMoreDetail = errorMessage !== summary;

  return (
    <section
      aria-label="Run error"
      className="rounded-lg border border-red-200 bg-red-50 p-4"
    >
      {/* One-line bold summary — answers "what went wrong?" at a glance */}
      <div className="mb-3 flex items-start gap-2">
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-red-600"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-red-700">
          {summary}
        </p>
      </div>

      {/* Full raw error — scrollable, capped height */}
      {hasMoreDetail && (
        <pre
          className="max-h-48 overflow-y-auto rounded border border-red-200 bg-red-100/50 p-3
                     font-mono text-xs text-red-800"
          aria-label="Full error output"
        >
          {errorMessage}
        </pre>
      )}
    </section>
  );
}
