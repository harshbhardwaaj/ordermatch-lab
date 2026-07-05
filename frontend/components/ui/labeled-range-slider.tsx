"use client";

type LabeledRangeSliderProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
};

export function LabeledRangeSlider({
  id,
  label,
  value,
  min,
  max,
  onChange,
  formatValue = (v) => `${v}%`,
}: LabeledRangeSliderProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-[var(--om-text)]">
          {label}
        </label>
        <span className="font-mono text-sm text-[var(--om-accent)]">{formatValue(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="mt-2 w-full accent-[var(--om-accent)]"
      />
    </div>
  );
}
