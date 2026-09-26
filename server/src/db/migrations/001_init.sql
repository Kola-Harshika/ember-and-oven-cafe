/**
 * Schema, version 1 — identity, catalogue and promotions.
 *
 * Money is stored as whole rupees (INTEGER) to match the menu, and timestamps as
 * ISO-8601 strings so the API and the browser read identical values.
 */

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  short_name TEXT NOT NULL,
  tagline    TEXT NOT NULL,
  blurb      TEXT NOT NULL,
  accent     TEXT NOT NULL,
  image      TEXT NOT NULL,
  craft_note TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE menu_items (
  id            TEXT PRIMARY KEY,
  category_id   TEXT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  short_name    TEXT NOT NULL,
  tagline       TEXT NOT NULL,
  description   TEXT NOT NULL,
  price         INTEGER NOT NULL CHECK (price >= 0),
  image         TEXT NOT NULL,
  tags          TEXT NOT NULL DEFAULT '[]',
  badge         TEXT,
  heat          INTEGER NOT NULL DEFAULT 0 CHECK (heat BETWEEN 0 AND 3),
  prep_minutes  INTEGER NOT NULL DEFAULT 10,
  rating        REAL NOT NULL DEFAULT 0,
  ordered_times INTEGER NOT NULL DEFAULT 0,
  nutrition     TEXT NOT NULL DEFAULT '{}',
  pairings      TEXT NOT NULL DEFAULT '[]',
  art           TEXT NOT NULL DEFAULT '[]',
  preset        TEXT,
  available     INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_menu_items_category ON menu_items (category_id);

CREATE TABLE option_groups (
  id          TEXT PRIMARY KEY,
  item_id     TEXT NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  helper      TEXT,
  type        TEXT NOT NULL CHECK (type IN ('single', 'multi')),
  is_required INTEGER NOT NULL DEFAULT 0,
  min_select  INTEGER,
  max_select  INTEGER,
  slot        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_option_groups_item ON option_groups (item_id);

CREATE TABLE option_choices (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES option_groups (id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  hint       TEXT,
  price      INTEGER NOT NULL DEFAULT 0,
  badge      TEXT,
  art        TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_option_choices_group ON option_choices (group_id);

CREATE TABLE coupons (
  code         TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  blurb        TEXT NOT NULL,
  percent      INTEGER,
  flat         INTEGER,
  max_discount INTEGER,
  min_subtotal INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1
);
