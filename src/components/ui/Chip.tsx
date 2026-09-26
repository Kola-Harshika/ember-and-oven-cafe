import type { ReactNode } from 'react';
import { sfx } from '@/lib/sfx';

export interface ChipProps {
  children: ReactNode;
  active?: boolean;
  tone?: 'default' | 'veg' | 'heat';
  static?: boolean;
  onClick?: () => void;
  title?: string;
}

/** Pill button used for filters, tags and multi-select options. */
export function Chip({ children, active = false, tone = 'default', static: isStatic = false, onClick, title }: ChipProps) {
  const classes = [
    'chip',
    active ? 'chip--on' : '',
    tone !== 'default' ? `chip--${tone}` : '',
    isStatic || !onClick ? 'chip--static' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (isStatic || !onClick) {
    return (
      <span className={classes} title={title}>
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={active}
      title={title}
      onClick={() => {
        sfx.tap();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

/** "Warm · 2 of 3" style heat indicator. */
export function HeatDots({ heat }: { heat: number }) {
  return (
    <span className="heat-dots" title={['No heat', 'Gentle', 'Warm', 'Fiery'][heat] ?? 'Warm'}>
      {[0, 1, 2].map((index) => (
        <i key={index} data-on={index < heat} />
      ))}
    </span>
  );
}
