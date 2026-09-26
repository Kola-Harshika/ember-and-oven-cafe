/**
 * Ambience: the room lighting of the site plus the sound switch.
 *
 * Three moods paint the whole palette via a `data-ambience` attribute on
 * <html>, and muted/persisted so a guest who turns sound off keeps it off.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import { setSfxMuted, sfx } from '@/lib/sfx';

export type AmbienceId = 'dusk' | 'daylight' | 'midnight';

export interface Ambience {
  id: AmbienceId;
  name: string;
  blurb: string;
}

export const AMBIENCES: Ambience[] = [
  { id: 'dusk', name: 'Dusk terrace', blurb: 'Warm bulbs, brass and low light' },
  { id: 'daylight', name: 'Morning light', blurb: 'Marble, linen and open windows' },
  { id: 'midnight', name: 'Midnight counter', blurb: 'Deep green, one lamp and a last espresso' },
];

interface AmbienceState {
  ambience: AmbienceId;
  soundOn: boolean;
  setAmbience: (id: AmbienceId) => void;
  cycleAmbience: () => void;
  toggleSound: () => void;
}

interface StoredAmbience {
  ambience: AmbienceId;
  soundOn: boolean;
}

const AmbienceContext = createContext<AmbienceState | null>(null);

export function AmbienceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredAmbience>(() =>
    loadJSON<StoredAmbience>(STORAGE_KEYS.ambience, { ambience: 'dusk', soundOn: true }),
  );

  // Paint the room and keep the sound engine in sync.
  useEffect(() => {
    document.documentElement.dataset.ambience = state.ambience;
    setSfxMuted(!state.soundOn);
  }, [state]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.ambience, state);
  }, [state]);

  const setAmbience = useCallback((id: AmbienceId) => {
    setState((current) => ({ ...current, ambience: id }));
  }, []);

  const cycleAmbience = useCallback(() => {
    setState((current) => {
      const index = AMBIENCES.findIndex((entry) => entry.id === current.ambience);
      const next = AMBIENCES[(index + 1) % AMBIENCES.length];
      if (current.soundOn) sfx.toggle();
      return { ...current, ambience: next.id };
    });
  }, []);

  const toggleSound = useCallback(() => {
    setState((current) => ({ ...current, soundOn: !current.soundOn }));
    // play a cue on the way on; muting is silent by definition
    if (!state.soundOn) sfx.toggle();
  }, [state.soundOn]);

  const value = useMemo(
    () => ({ ambience: state.ambience, soundOn: state.soundOn, setAmbience, cycleAmbience, toggleSound }),
    [state.ambience, state.soundOn, setAmbience, cycleAmbience, toggleSound],
  );

  return <AmbienceContext.Provider value={value}>{children}</AmbienceContext.Provider>;
}

export function useAmbience(): AmbienceState {
  const context = useContext(AmbienceContext);
  if (!context) throw new Error('useAmbience must be used inside <AmbienceProvider>');
  return context;
}

export function ambienceMeta(id: AmbienceId): Ambience {
  return AMBIENCES.find((entry) => entry.id === id) ?? AMBIENCES[0];
}
