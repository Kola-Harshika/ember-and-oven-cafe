/**
 * Micro sound effects synthesised with the Web Audio API.
 *
 * No audio files are shipped — every cue is a couple of oscillators, which keeps
 * the bundle tiny and lets us shape the "kitchen" feel (soft clicks, a warm
 * bell when an order is placed, ticks while tracking).
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created
 * lazily on the first play() call and resumed if it was suspended.
 */

type Cue =
  | 'tap'
  | 'add'
  | 'remove'
  | 'toggle'
  | 'success'
  | 'error'
  | 'coin'
  | 'tick'
  | 'door'
  | 'pay';

let context: AudioContext | null = null;
let muted = false;

const CUES: Record<Cue, { freq: number; to?: number; dur: number; type: OscillatorType; gain: number }[]> = {
  tap: [{ freq: 420, dur: 0.06, type: 'triangle', gain: 0.16 }],
  add: [
    { freq: 520, dur: 0.09, type: 'triangle', gain: 0.18 },
    { freq: 780, to: 900, dur: 0.16, type: 'sine', gain: 0.14 },
  ],
  remove: [{ freq: 300, to: 190, dur: 0.14, type: 'triangle', gain: 0.14 }],
  toggle: [{ freq: 640, to: 880, dur: 0.08, type: 'square', gain: 0.09 }],
  success: [
    { freq: 523, dur: 0.12, type: 'sine', gain: 0.2 },
    { freq: 659, dur: 0.14, type: 'sine', gain: 0.18 },
    { freq: 880, dur: 0.26, type: 'sine', gain: 0.16 },
  ],
  error: [
    { freq: 240, dur: 0.12, type: 'sawtooth', gain: 0.12 },
    { freq: 180, dur: 0.2, type: 'sawtooth', gain: 0.1 },
  ],
  coin: [{ freq: 1180, to: 1480, dur: 0.14, type: 'triangle', gain: 0.16 }],
  tick: [{ freq: 900, dur: 0.035, type: 'sine', gain: 0.08 }],
  door: [
    { freq: 160, to: 90, dur: 0.4, type: 'sine', gain: 0.16 },
    { freq: 420, to: 320, dur: 0.3, type: 'triangle', gain: 0.08 },
  ],
  pay: [
    { freq: 392, dur: 0.1, type: 'sine', gain: 0.16 },
    { freq: 523, dur: 0.1, type: 'sine', gain: 0.16 },
    { freq: 784, dur: 0.3, type: 'sine', gain: 0.14 },
  ],
};

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

export function setSfxMuted(next: boolean): void {
  muted = next;
}

export function isSfxMuted(): boolean {
  return muted;
}

export function playCue(cue: Cue): void {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;

  let offset = 0;
  for (const layer of CUES[cue]) {
    const start = ctx.currentTime + offset;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = layer.type;
    oscillator.frequency.setValueAtTime(layer.freq, start);
    if (layer.to) oscillator.frequency.exponentialRampToValueAtTime(layer.to, start + layer.dur);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(layer.gain, 0.0002), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + layer.dur);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + layer.dur + 0.03);

    offset += layer.dur * 0.65;
  }
}

export const sfx = {
  tap: () => playCue('tap'),
  add: () => playCue('add'),
  remove: () => playCue('remove'),
  toggle: () => playCue('toggle'),
  success: () => playCue('success'),
  error: () => playCue('error'),
  coin: () => playCue('coin'),
  tick: () => playCue('tick'),
  door: () => playCue('door'),
  pay: () => playCue('pay'),
};

/** Gentle haptic feedback where the device supports it. */
export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}
