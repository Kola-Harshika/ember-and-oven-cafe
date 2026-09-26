import type { ReactNode } from 'react';

export interface ProgressRingProps {
  /** 0 → 1 */
  progress: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}

/** Countdown ring used on the order tracker. */
export function ProgressRing({ progress, size = 220, stroke = 14, children }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-soft)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring__label">{children}</div>
    </div>
  );
}

/** Thin determinate bar, used inside the kitchen log and game headers. */
export function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      style={{
        height: 6,
        borderRadius: 999,
        background: 'color-mix(in srgb, var(--ink) 12%, transparent)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: 999,
          background: 'linear-gradient(90deg, var(--accent-soft), var(--accent))',
          transition: 'width 320ms var(--ease)',
        }}
      />
    </div>
  );
}
