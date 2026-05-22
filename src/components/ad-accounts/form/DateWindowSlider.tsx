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
          style={{
            left: `calc(${tooltipPos}% + ${(0.5 - tooltipPos / 100) * 12}px)`,
          }}
          aria-hidden="true"
        >
          <div className="rounded-md bg-slate-900 px-1.5 py-0.5 text-xs font-medium text-white shadow-sm">
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
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform"
          style={{
            background: `linear-gradient(to right, #0f172a 0%, #0f172a ${tooltipPos}%, #e2e8f0 ${tooltipPos}%, #e2e8f0 100%)`,
          }}
        />
      </div>

      {/* Preset quick-picks */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Quick select:</span>
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
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {preset}d
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs font-medium text-slate-900">
          Last {value} {value === 1 ? "day" : "days"}
        </span>
      </div>
    </div>
  );
}
