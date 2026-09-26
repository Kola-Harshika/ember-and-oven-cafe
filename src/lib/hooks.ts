/** Small shared hooks used across the ordering flow. */
import { useEffect, useRef, useState } from 'react';

/** Seconds elapsed since a timestamp, refreshed once a second. */
export function useElapsedSeconds(startedAt: number | null | undefined, enabled = true): number {
  const compute = () => (startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0);
  const [elapsed, setElapsed] = useState(compute);

  useEffect(() => {
    if (!startedAt || !enabled) return;
    setElapsed(compute());
    const id = window.setInterval(() => setElapsed(compute()), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, enabled]);

  return elapsed;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return reduced;
}

/** Run a handler when a specific key is pressed (Escape by default). */
export function useOnKey(key: string, handler: () => void, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === key) handlerRef.current();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [key, enabled]);
}

/** Freeze the page behind a modal or sheet. */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);

  return undefined;
}

/** Fires a callback on an interval while enabled. */
export function useInterval(callback: () => void, ms: number | null): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (ms === null) return;
    const id = window.setInterval(() => callbackRef.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

/** Tracks a CSS-safe scroll offset for sticky headers. */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}
