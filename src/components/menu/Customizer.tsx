import { sfx } from '@/lib/sfx';
import type { MenuItem, OptionChoice, OptionGroup, Selection } from '@/data/types';
import { formatDelta } from '@/lib/format';
import { Chip } from '@/components/ui/Chip';

const SLOT_TITLES: Record<OptionGroup['slot'], string> = {
  size: 'Size & shape',
  build: 'How it is built',
  flavour: 'Flavour & base',
  toppers: 'Toppers & dips',
  finish: 'The finish',
};

const SLOT_NOTES: Record<OptionGroup['slot'], string> = {
  size: 'Set at the pass, nothing is re-sized later.',
  build: 'This is where most of the character comes from.',
  flavour: 'The base is the star — the rest is balance.',
  toppers: 'Each extra is priced the moment you tap it.',
  finish: 'The last thing added before it leaves the kitchen.',
};

export interface CustomizerProps {
  item: MenuItem;
  selection: Selection;
  onChange: (next: Selection) => void;
}

/**
 * The heart of the item page: every option group rendered as either a pick-one
 * card list or a chip cloud that respects the group's max.
 */
export function Customizer({ item, selection, onChange }: CustomizerProps) {
  const groupIds = item.groups.map((group) => group.id);

  const pick = (group: OptionGroup, choice: OptionChoice) => {
    if (group.type === 'single') {
      if ((selection[group.id] ?? [])[0] === choice.id) return;
      onChange({ ...selection, [group.id]: [choice.id] });
      return;
    }

    const current = selection[group.id] ?? [];
    if (current.includes(choice.id)) {
      onChange({ ...selection, [group.id]: current.filter((id) => id !== choice.id) });
      return;
    }

    const cap = group.max ?? Number.POSITIVE_INFINITY;
    if (current.length >= cap) {
      sfx.error();
      return;
    }
    onChange({ ...selection, [group.id]: [...current, choice.id] });
  };

  return (
    <div className="customiser" data-groups={groupIds.length}>
      {item.groups.map((group) => {
        const picked = selection[group.id] ?? [];
        const full = group.type === 'multi' && picked.length >= (group.max ?? Number.POSITIVE_INFINITY);

        return (
          <section className="option-group" key={group.id}>
            <header className="option-group__head">
              <div>
                <h3>{SLOT_TITLES[group.slot]}</h3>
                <p className="muted">{group.helper ?? SLOT_NOTES[group.slot]}</p>
              </div>
              {group.type === 'multi' && (
                <span className={`option-group__count${full ? ' is-full' : ''}`}>
                  {picked.length}
                  {group.max ? ` / ${group.max}` : ''} chosen
                </span>
              )}
            </header>

            {group.type === 'single' ? (
              <div className="option-list">
                {group.choices.map((choice) => {
                  const active = picked[0] === choice.id;
                  return (
                    <button
                      type="button"
                      key={choice.id}
                      className={`option-card${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => {
                        sfx.tap();
                        pick(group, choice);
                      }}
                    >
                      <span className="option-card__lead">
                        <span className="option-card__label">
                          {choice.label}
                          {choice.badge && <em className="option-card__badge">{choice.badge}</em>}
                        </span>
                        {choice.hint && <small>{choice.hint}</small>}
                      </span>
                      <span className="option-card__price">{formatDelta(choice.price)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="chip-cloud">
                {group.choices.map((choice) => {
                  const active = picked.includes(choice.id);
                  return (
                    <Chip
                      key={choice.id}
                      active={active}
                      onClick={() => pick(group, choice)}
                      title={choice.hint ?? choice.label}
                    >
                      {choice.label}
                      <span className="chip__delta">{formatDelta(choice.price)}</span>
                    </Chip>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
