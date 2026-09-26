/**
 * Schema, version 3 — rewards earned while an order is being prepared.
 *
 * `bonus_discount` is the discount the guest had already earned *before* checkout
 * (it is baked into the quote). `bonus_credit` is earned afterwards, in the
 * waiting-room games, and is subtracted from the amount still to pay.
 */

ALTER TABLE orders ADD COLUMN bonus_credit INTEGER NOT NULL DEFAULT 0;
