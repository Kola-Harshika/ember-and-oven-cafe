/**
 * Schema, version 2 — orders, their line items, the status history and payments.
 */

CREATE TABLE orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users (id) ON DELETE SET NULL,
  guest_token     TEXT,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  customer_email  TEXT,
  mode            TEXT NOT NULL CHECK (mode IN ('dine-in', 'takeaway', 'delivery')),
  table_no        TEXT,
  address         TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received', 'preparing', 'cooking', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  subtotal        INTEGER NOT NULL,
  coupon_code     TEXT,
  coupon_discount INTEGER NOT NULL DEFAULT 0,
  bonus_discount  INTEGER NOT NULL DEFAULT 0,
  taxable         INTEGER NOT NULL,
  tax             INTEGER NOT NULL,
  delivery_fee    INTEGER NOT NULL DEFAULT 0,
  tip             INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL,
  eta_minutes     INTEGER NOT NULL,
  placed_at       TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  cancelled_at    TEXT,
  cancel_reason   TEXT
);
CREATE INDEX idx_orders_user ON orders (user_id, placed_at DESC);
CREATE INDEX idx_orders_status ON orders (status, placed_at);

CREATE TABLE order_items (
  id                TEXT PRIMARY KEY,
  order_id          TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  item_id           TEXT NOT NULL REFERENCES menu_items (id),
  name              TEXT NOT NULL,
  short_name        TEXT NOT NULL,
  category_id       TEXT NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  unit_price        INTEGER NOT NULL,
  line_total        INTEGER NOT NULL,
  selection         TEXT NOT NULL DEFAULT '{}',
  selection_summary TEXT NOT NULL DEFAULT '',
  selection_extras  TEXT NOT NULL DEFAULT '[]',
  art               TEXT NOT NULL DEFAULT '[]',
  note              TEXT
);
CREATE INDEX idx_order_items_order ON order_items (order_id);

CREATE TABLE order_status_events (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  author     TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_status_events_order ON order_status_events (order_id, created_at);

CREATE TABLE payments (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  provider       TEXT NOT NULL,
  method         TEXT NOT NULL,
  amount         INTEGER NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  reference      TEXT,
  failure_reason TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX idx_payments_order ON payments (order_id);
