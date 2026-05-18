import * as React from "react";

interface StepConnectorProps {
  className?: string;
}

export function StepConnector({ className }: StepConnectorProps) {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto h-5 w-px border-l border-dotted border-border ${className ?? ""}`}
    />
  );
}
