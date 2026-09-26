/**
 * Tiny toast queue used for "added to tray", "order placed" and reward moments.
 * Kept deliberately small: a stack of at most three, auto-dismissed.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { sfx } from '@/lib/sfx';

export type ToastTone = 'default' | 'success' | 'warning' | 'reward';

export interface Toast {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const LIFETIME: Record<ToastTone, number> = {
  default: 3200,
  success: 3600,
  warning: 4200,
  reward: 5000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);

      if (toast.tone === 'reward') sfx.coin();
      else if (toast.tone === 'success') sfx.success();
      else if (toast.tone === 'warning') sfx.error();
      else sfx.tap();

      window.setTimeout(() => dismiss(id), LIFETIME[toast.tone]);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
