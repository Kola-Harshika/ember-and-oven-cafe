import type { ButtonHTMLAttributes } from 'react';
import { sfx } from '@/lib/sfx';

type Variant = 'default' | 'primary' | 'ghost' | 'quiet' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** skip the click cue for silent interactions */
  silent?: boolean;
}

export function Button({
  variant = 'default',
  size = 'md',
  block = false,
  silent = false,
  className,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    variant !== 'default' ? `btn--${variant}` : '',
    size !== 'md' ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={(event) => {
        if (!silent) sfx.tap();
        onClick?.(event);
      }}
      {...rest}
    />
  );
}

export function IconButton({
  label,
  className,
  onClick,
  silent = false,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; silent?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={['icon-btn', className ?? ''].filter(Boolean).join(' ')}
      onClick={(event) => {
        if (!silent) sfx.tap();
        onClick?.(event);
      }}
      {...rest}
    />
  );
}
