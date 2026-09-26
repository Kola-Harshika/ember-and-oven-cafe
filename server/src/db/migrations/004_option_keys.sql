/**
 * Schema, version 4 — option keys scoped to their dish.
 *
 * Option ids are authored once and reused across the menu: every pizza shares
 * `crust-thin`, every shake shares `size-tall`. Keying them by id alone therefore
 * collapsed all of that into single rows, so the primary keys are now scoped to the
 * dish, and a choice points at its group with the same scope.
 *
 * Nothing is lost by rebuilding these tables: they are regenerated from the authored
 * catalogue by the seed, and placed orders keep their own immutable snapshots.
 */

DROP TABLE IF EXISTS option_choices;
DROP TABLE IF EXISTS option_groups;

CREATE TABLE option_groups (
  item_id     TEXT NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL,
  helper      TEXT,
  type        TEXT NOT NULL CHECK (type IN ('single', 'multi')),
  is_required INTEGER NOT NULL DEFAULT 0,
  min_select  INTEGER,
  max_select  INTEGER,
  slot        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, id)
);

CREATE TABLE option_choices (
  item_id    TEXT NOT NULL,
  id         TEXT NOT NULL,
  group_id   TEXT NOT NULL,
  label      TEXT NOT NULL,
  hint       TEXT,
  price      INTEGER NOT NULL DEFAULT 0,
  badge      TEXT,
  art        TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, id),
  FOREIGN KEY (item_id, group_id) REFERENCES option_groups (item_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_option_choices_group ON option_choices (item_id, group_id);
