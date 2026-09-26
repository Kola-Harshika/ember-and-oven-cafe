import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/context/ToastContext';

const ICONS: Record<string, string> = {
  default: '•',
  success: '✓',
  warning: '!',
  reward: '★',
};

/** Stack of transient confirmations, bottom-centre on mobile, bottom-right on desktop. */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            className={`toast toast--${toast.tone}`}
            onClick={() => dismiss(toast.id)}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <span className="toast__icon" aria-hidden="true">
              {ICONS[toast.tone]}
            </span>
            <span className="toast__text">
              <strong>{toast.title}</strong>
              {toast.message && <small>{toast.message}</small>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
