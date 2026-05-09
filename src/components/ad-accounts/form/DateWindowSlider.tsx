"use client";

import * as React from "react";

interface DateWindowSliderProps {
  value: number;
  onChange: (days: number) => void;
  onBlur?: () => void;
}

export function DateWindowSlider({
  value,
  onChange,
  onBlur,
}: DateWindowSliderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [tooltipPos, setTooltipPos] = React.useState(0);
  const trackRef = React.useRef<HTMLInputElement>(null);

  // Calculate thumb percentage position for tooltip placement
  function calcPercent(v: number) {
    return ((v - 1) / (30 - 1)) * 100;
  }

  React.useEffect(() => {
    setTooltipPos(calcPercent(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = parseInt(e.target.value, 10);
    if (!isNaN(next)) {
      onChange(next);
      setTooltipPos(calcPercent(next));
    }
  }

  const presets = [1, 7, 14, 30];

  return (
    <div className="space-y-3">
      <div className="relative pt-6">
        {/* Floating tooltip above thumb */}
        <div
          className="pointer-events-none absolute top-0 flex -translate-x-1/2 items-center"
          style={{ left: `calc(${tooltipPos}% + ${(0.5 - tooltipPos / 100) * 12}px)` }}
          aria-hidden="true"
        >
          <div className="rounded-md bg-foreground px-1.5 py-0.5 text-xs font-medium text-background shadow-sm">
            Last {value} {value === 1 ? "day" : "days"}
          </div>
        </div>

        <input
          ref={trackRef}
          type="range"
          min={1}
          max={30}
          step={1}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => {
            setIsDragging(false);
            onBlur?.();
          }}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => {
            setIsDragging(false);
            onBlur?.();
          }}
          onBlur={() => {
            if (!isDragging) onBlur?.();
          }}
          aria-label={`Date window: Last ${value} days`}
          aria-valuemin={1}
          aria-valuemax={30}
          aria-valuenow={value}
          aria-valuetext={`Last ${value} days`}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-input outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-sm"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${tooltipPos}%, hsl(var(--input)) ${tooltipPos}%, hsl(var(--input)) 100%)`,
          }}
        />
      </div>

      {/* Preset quick-picks */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick select:</span>
        <div className="flex gap-1">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset);
                setTooltipPos(calcPercent(preset));
                onBlur?.();
              }}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                value === preset
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {preset}d
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs font-medium text-foreground">
          Last {value} {value === 1 ? "day" : "days"}
        </span>
      </div>
    </div>
  );
}
