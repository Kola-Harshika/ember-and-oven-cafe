import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './Button';
import { useLockBodyScroll, useOnKey } from '@/lib/hooks';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centred dialog with a blurred backdrop. */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useOnKey('Escape', onClose, open);
  useLockBodyScroll(open);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button type="button" className="modal__scrim" aria-label="Close" onClick={onClose} />
          <motion.div
            className="modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 26, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.99, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <header className="modal__head">
              <h3>{title}</h3>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
                Close
              </Button>
            </header>
            <div className="modal__body">{children}</div>
            {footer && <footer className="modal__foot">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
