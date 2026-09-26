import { useAmbience } from '@/context/AmbienceContext';
import { IconButton } from '@/components/ui/Button';

/** Cycles the room lighting and toggles the sound cues. */
export function AmbienceToggle() {
  const { ambience, soundOn, cycleAmbience, toggleSound } = useAmbience();

  return (
    <div className="ambience">
      <IconButton
        label={`Room: ${ambience}. Switch lighting`}
        onClick={cycleAmbience}
        className="ambience__light"
        aria-label={`Room lighting: ${ambience}. Switch lighting`}
      >
        <span className={`ambience__bulb ambience__bulb--${ambience}`} aria-hidden="true" />
      </IconButton>
      <IconButton
        label={soundOn ? 'Mute kitchen sounds' : 'Unmute kitchen sounds'}
        onClick={toggleSound}
        className="ambience__sound"
        aria-pressed={soundOn}
      >
        {soundOn ? (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 9h3l4-3.5v13L7 15H4Zm11.5-2.6a7 7 0 0 1 0 11.2M13.2 9.4a3.6 3.6 0 0 1 0 5.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 9h3l4-3.5v13L7 15H4Zm11 1.5 4 4m0-4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        )}
      </IconButton>
    </div>
  );
}
