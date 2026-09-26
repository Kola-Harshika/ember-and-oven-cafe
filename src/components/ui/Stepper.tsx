import { sfx } from '@/lib/sfx';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

/** Quantity control for tray lines. */
export function Stepper({ value, onChange, min = 1, max = 20, label = 'Quantity' }: StepperProps) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    if (delta > 0) sfx.add();
    else sfx.remove();
    onChange(next);
  };

  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => step(-1)} aria-label="Decrease quantity" disabled={value <= min}>
        −
      </button>
      <output>{value}</output>
      <button type="button" onClick={() => step(1)} aria-label="Increase quantity" disabled={value >= max}>
        +
      </button>
    </div>
  );
}
