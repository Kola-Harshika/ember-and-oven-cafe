import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface FieldShell {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  id?: string;
}

function FieldShell({ label, hint, error, children, id }: FieldShell) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      <input id={id} className="input" aria-invalid={error ? 'true' : undefined} {...rest} />
    </FieldShell>
  );
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextAreaField({ label, hint, error, id, ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      <textarea id={id} className="textarea" aria-invalid={error ? 'true' : undefined} {...rest} />
    </FieldShell>
  );
}
