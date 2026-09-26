# Ember & Oven — an online café experience

A full-stack café ordering project: browse a small, opinionated menu, **build each dish
visually** (the drawing changes as you choose), send it to a real order book, watch the
kitchen work through it, play a couple of games while you wait, and pay.

It is deliberately **not** a generic food-delivery clone. It is one café, three counters
(wood-fired pizza, hand-cut fries, thick shakes), and a journey that feels like visiting
the room rather than filling in a form.

```
browse → customise (live preview) → tray → checkout → order code
      → kitchen status timeline → waiting-room games → test payment → served
```

---

## 1. Project overview

| | |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite, React Router, Framer Motion, hand-written CSS design system (no Tailwind) |
| **Backend** | Node 24 + Express 5 + TypeScript, run directly with `tsx` (no build step) |
| **Database** | SQLite through Node's built-in `node:sqlite` driver — a real relational database with **zero native build steps** |
| **Auth** | Server-side sessions in SQLite, `scrypt` password hashing (Node `crypto`), `HttpOnly` + `SameSite=Lax` cookies, `customer` / `staff` roles |
| **Validation** | `zod` schemas at every API boundary |
| **Tests** | Vitest + Supertest (60 tests across 9 files) |
| **Payments** | Provider-shaped architecture; the default provider is a clearly-labelled local **test** flow |

Preserved from the original build: the visual identity (Fraunces + Manrope, warm
dark-room palette with three ambience themes), the live SVG dish renderers, the
synthesised Web Audio sound cues, the animated hero and menu, and every responsive
breakpoint.

## 2. The problem it solves

Ordering online is usually a form with a price attached. This project treats the two
things cafés actually struggle with as first-class:

1. **Customisation is the product.** A pizza is a dozen decisions, and the guest should
   see the consequence of each one. Every choice redraws the dish *and* reprices it, and
   the API re-validates that customisation before it becomes an order.
2. **The wait is part of the experience.** Instead of a spinner, the guest gets a real
   status timeline (driven by the kitchen, not by the browser), a live ticket log, a
   countdown, and two short café games whose winnings come off the bill.

It also solves the mundane-but-important things: a customer only ever sees their own
orders, staff see everything, prices are computed server-side, and nothing claims to be
a real payment when it is not.

## 3. Key features

**Guest experience**
- Menu of 3 categories / 17 dishes, each with its own customisation shape (pizza: size,
  crust, cheese, toppings, finish; fries: cut, seasoning, dips, add-ons; shakes: size,
  base, sweetness, blend-ins, topping crown) — no shared generic form.
- Live SVG preview that morphs with every option, plus per-option price deltas.
- Tray with per-line editing, quantity, notes, fulfilment mode, coupons, tips.
- Kitchen ticket experience: order code, status timeline, live log, receipt, countdown.
- Two waiting-room games (Bean Rush, Ticket Match) that award bill credit.
- Three ambience themes with persisted room lighting and sound cues.

**Accounts**
- Register / sign in / sign out, profile editing, password change, order history.
- Guest checkout works without an account (the API issues a one-time guest token).

**Kitchen (staff only)**
- Live order book with filters, full ticket detail, one-step-at-a-time status moves,
  cancellation with a reason, and a manual "sold out" switch per dish.

**Platform**
- Server-authoritative pricing, coupon validation and customisation validation.
- Order status history (who changed what, when, why).
- Cancellation policy with a grace window, warnings and hard stops.
- Payment records with real states: pending, processing, paid, failed, cancelled,
  refunded.
- Health endpoint that reports its own configuration honestly.

## 4. Customer journey

| Step | Where | What actually happens |
|---|---|---|
| 1 | `/` | Ambience is chosen, the hero dish is drawn live from the catalogue's own option keys |
| 2 | `/menu` | Filters, search and sort over the served catalogue |
| 3 | `/menu/:itemId` | Customiser redraws the SVG and reprices per tap; notes per line |
| 4 | `/tray` | Lines, quantities, fulfilment mode, coupon, tip — all still local |
| 5 | `/checkout` | The API **quotes** the tray (`POST /api/orders/quote`) and that number is shown as final |
| 6 | `/order/:id` | `POST /api/orders` creates a ticket (`ORD-1047`); the kitchen sees it immediately |
| 7 | Track tab | Status timeline + live log, polled every 5s while work is outstanding |
| 8 | Play tab | Games award credit through `POST /api/orders/:id/rewards` (capped, best-round only) |
| 9 | Pay tab | Test payment: pending → paid, or failed/cancelled to show those states |
| 10 | — | Staff move the ticket through stations; the tracker updates itself |

## 5. Technology stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 18, TypeScript 5.6 (`strict`, `noUnusedLocals`), Vite 5 | Kept from the original project |
| Routing | React Router 6 | Seven customer routes + the staff area |
| Motion | Framer Motion 11 | Existing page/section transitions, kept |
| Styling | Hand-written CSS (custom properties, 3 ambience themes) | Full control of the café aesthetic, no utility-class noise |
| API | Express 5 + TypeScript via `tsx` | Native async error handling, no build step, familiar middleware model |
| Database | `node:sqlite` (SQLite 3.53) built into Node 24 | A real relational database with **no native compilation** and no ORM overhead |
| Validation | `zod` | One schema per boundary, friendly 422 payloads |
| Auth | Node `crypto` (`scrypt`) + sessions in SQLite | No hashing dependency, sessions revocable server-side |
| Tests | Vitest + Supertest | Fast HTTP-level integration tests against the real app |
| Config | `.env` (git-ignored) + `.env.example` | No secret committed; `--env-file-if-exists` for zero-config local runs |

## 6. Architecture

```
cafe/
├── src/                     # React app (the original frontend, extended)
│   ├── context/             # Auth, Order, Cart, Ambience, Toast providers
│   ├── components/
│   │   ├── order/           # timeline, receipt, payment panel, games, cancel dialog
│   │   ├── admin/           # kitchen board, ticket, availability board
│   │   ├── account/         # profile details, order history
│   │   ├── visual/          # live SVG dish renderers (kept)
│   │   └── cart/ menu/ ui/ layout/ games/   (kept, extended)
│   ├── services/            # typed API clients — the only place that talks HTTP
│   ├── lib/                 # apiClient, guest-order token, hooks, formatting
│   ├── data/                # authored catalogue (single source of truth)
│   └── pages/               # home, menu, item, tray, checkout, order, auth, admin
├── server/
│   ├── src/
│   │   ├── config/env.ts    # every environment value + production checks
│   │   ├── db/              # connection, migrations/*.sql, seed, reset
│   │   ├── http/            # cookies, auth context, validation, error handling
│   │   ├── repositories/    # SQL lives only here
│   │   ├── services/        # pricing authority, orders, lifecycle, payments, auth
│   │   ├── routes/          # thin HTTP layer: auth, menu, orders, payments, admin
│   │   └── app.ts / index.ts# app factory (testable) and bootstrap
│   └── tests/               # Vitest + Supertest suites + harness
├── shared/                  # logic used by BOTH sides (see below)
└── tools/                   # image fetcher, API smoke script
```

**The `shared/` folder is the interesting part.** Pricing, coupon rules, the order
lifecycle and the ETA estimate are pure TypeScript with no imports from either side, so
the browser and the API execute the *same* code:

- the browser runs it for instant feedback while you customise a dish;
- the API runs it again, against database prices, before it accepts an order.

There is no second implementation to drift, and `shared/pricing.test.ts` pins the rules.

**Request flow for an order**

```
CheckoutPage → orderApi.quote()  → POST /api/orders/quote
             → orderApi.create() → POST /api/orders
                                   └─ quoteService   (authoritative pricing + validation)
                                      └─ orderService (code allocation, snapshot, ETA)
                                         └─ orderRepository (transaction: order + lines + first event)
```

Layering rule: routes never touch SQL, repositories never contain business rules, and
services never see `req`/`res`. Everything the browser can see is assembled by a mapper,
so no column name or password hash leaks into a response by accident.

## 7. Database design

SQLite, applied through versioned migrations (`server/src/db/migrations/*.sql`) and
recorded in `schema_migrations`.

| Table | Purpose | Notes |
|---|---|---|
| `users` | Accounts | `email` unique + `COLLATE NOCASE`, `role` ∈ (customer, staff) |
| `sessions` | Server-side sessions | `user_id` FK, `expires_at`, deleted on logout and on expiry |
| `categories` | The three counters | name, tagline, blurb, accent, image |
| `menu_items` | Dishes | price in whole rupees, tags/nutrition/pairings/art as JSON, `available` |
| `option_groups` | Customisation groups per dish | PK `(item_id, id)`, `type` ∈ (single, multi), min/max, slot |
| `option_choices` | Options | PK `(item_id, id)`, FK → `(item_id, group_id)`, price delta, art key, default |
| `coupons` | Promotions | percent or flat, cap, minimum subtotal, active flag |
| `orders` | One row per ticket | code, owner or guest token, customer details, mode, status, payment status, money snapshot, ETA |
| `order_items` | Immutable line snapshots | name, unit price, selection JSON, summary, extras, art, note |
| `order_status_events` | Status history | status, note, author (`staff:name`), timestamp |
| `payments` | Payment attempts | provider, method, amount, status, reference, failure reason |

Decisions worth calling out:

- **Money is stored in whole rupees** (INTEGER), matching how the menu is written, with
  tax rounded once — no floating-point drift between the browser and the database.
- **Orders are snapshots.** A dish renamed, repriced or hidden later never rewrites
  history: `order_items` keeps the name, price, options and art keys of that day.
- **Option keys are scoped to their dish** (`PRIMARY KEY (item_id, id)`). Option ids such
  as `crust-thin` are authored once and reused by every pizza, so scoping is what makes
  reuse safe. This was a genuine bug surfaced by the tests; `004_option_keys.sql`
  documents the fix.
- **Availability, not deletion.** A dish dropped from the catalogue is marked
  `available = 0` by the seed rather than deleted, because orders reference it.
- The catalogue is **authored once** in `src/data/*` (typed, reviewable, diffable) and
  **seeded** into SQLite, which is the runtime authority for pricing and availability.

## 8. Authentication

- Passwords are hashed with **`scrypt`** (Node `crypto`), stored as
  `scrypt$<salt>$<hash>`; comparison is constant-time.
- Sessions are **rows in the database**, referenced by a 256-bit random token in an
  `HttpOnly`, `SameSite=Lax` (and `Secure` in production) cookie. Signing out deletes the
  row, so a session can be revoked server-side; expired rows are removed on lookup.
- `requireUser` / `requireStaff` guards read the resolved session from the request. Staff
  routes are protected **server-side** — `/admin` merely explains itself to a customer.
- Wrong password and unknown account return the **same** message so accounts cannot be
  enumerated; duplicate registration returns `409 duplicate_email`.
- **The staff account is never hard-coded.** `npm run db:seed` reads `STAFF_EMAIL` and
  `STAFF_PASSWORD` from the environment; with no password configured it generates one and
  prints it once.
- **Guest checkout** is a first-class API path: an order placed without a session stores a
  guest token, which the browser keeps locally so it can reopen that tracker.

## 9. Order management

Statuses: `received → preparing → cooking → ready → out_for_delivery → delivered`, plus
`cancelled`. The transition table lives in `shared/orderStatus.ts`, so the tracker, the
kitchen board and the API cannot disagree about what "cooking" means.

- **One step at a time.** `canTransition` only allows the next station (or a cancel while
  the food is still in-house). Skipping, going backwards or reopening a delivered order
  returns `409 invalid_transition`.
- **Every move is history.** Each change writes a row to `order_status_events` with the
  actor (`staff:name`) and an optional note, which is exactly the log the guest sees.
- **Cancellation policy** (shared, so the UI can explain it before you tap):
  - `received` inside the grace window → allowed;
  - `preparing` → allowed with a warning that prep has started;
  - `cooking` / `ready` → refused, "the kitchen has already cooked this";
  - `out_for_delivery` → refused outright;
  - past the grace window → refused with the reason.
- **Money is reconciled, not forgotten.** Cancelling a paid order marks it `refunded`;
  cancelling a processing payment marks it `cancelled`.
- **Identifiers** are human-readable (`ORD-1001`…), allocated with a retry on collision,
  and every read is scoped: another customer's code returns `404`, not `403`, so codes
  cannot be probed for existence.

## 10. Payment architecture

The API exposes a provider-shaped interface, and the default implementation is a **local
test flow**. Nothing in this repository can move real money.

```
GET  /api/payments/config          → { provider: { id: 'mock', live: false, note }, methods }
POST /api/payments                 → creates a payment row (status: pending)
POST /api/payments/:id/confirm     → test provider: pending → processing → paid
POST /api/payments/:id/fail        → records a failure and a reason
POST /api/payments/:id/cancel      → records an abandoned attempt
GET  /api/payments/order/:orderId  → the attempt history for the order's owner
```

- **States are rows, not flags:** `pending`, `processing`, `paid`, `failed`, `cancelled`,
  `refunded`. The order mirrors the latest state in `orders.payment_status`.
- **Honest UI.** When the API reports `live: false`, the pay tab says *"Test payment. No
  money moves…"* and the reference is visibly local (`MOCK-…`). No copy anywhere claims a
  real charge happened.
- **Idempotent confirmation.** Confirming an already-paid payment returns the same row and
  reference, so a refresh cannot double-charge.
- **Wiring a real gateway** means implementing the same operations against Razorpay or
  Stripe and confirming from the provider's signed webhook. The confirm route *refuses* to
  act when a live provider is configured, precisely because a browser must never be the
  source of truth for a real payment.
- Configuration comes from the environment (`PAYMENT_PROVIDER`, `RAZORPAY_KEY_ID`,
  `RAZORPAY_KEY_SECRET`, `STRIPE_SECRET_KEY`). Missing keys produce a clear `503`, never a
  silent fake success.

## 11. Café waiting experience

The tracker's **Play** tab answers "what do I do for twelve minutes?":

- **Bean Rush** — canvas game: slide the cup, catch the beans, dodge the burnt crumbles.
  Arrow keys work too, and it is fully playable on a phone.
- **Ticket Match** — flip tickets and pair the dishes that are actually on *your* order
  (padded from the menu when the order is small), scored on moves and time.

Both award **credit on the order itself** — `POST /api/orders/:id/rewards` — so the
discount survives a refresh and shows up on the pay tab. Three rules keep it fair:

1. only a *better* round awards anything (replaying the same score earns nothing);
2. each award is capped per request;
3. the server caps the order's total credit at ₹300 and refuses credit on closed orders.

Alongside the games, the guest keeps the live status timeline, the ticket log, the
estimated time remaining and the payment panel — the wait is informative, not just filled.

## 12. Kitchen dashboard (staff area)

`/admin` is a real operations screen, protected by the API rather than by hiding a button:

- **Order book** with filters (in the kitchen / ready / with the rider / closed /
  cancelled / everything) and a 10-second refresh.
- **Full tickets**: code, time, mode, table, customer name and phone, every line with its
  summary, extras and note, the total, and the payment status.
- **One-step status moves** — the button offers exactly the transitions the API accepts,
  and refusals are surfaced instead of swallowed.
- **Cancellation with a reason**, shown to the guest and recorded in the history.
- **Menu availability** — flip a dish to sold out mid-service; quoting and order creation
  immediately refuse it while past orders keep their snapshot.
- **Counts per status** so the pass can see the queue at a glance.

## 13. Installation

Requires **Node 24 or newer** (`node:sqlite` is what makes the zero-dependency database
possible) and npm.

```bash
git clone <your-fork> cafe && cd cafe
npm install

# optional but recommended: choose your own staff credentials
cp .env.example .env        # Windows: copy .env.example .env

npm run db:setup            # migrations + seed (creates server/data/ember-oven.sqlite)
npm run dev:full            # API on :4000, web app on :5173
```

Open <http://localhost:5173>. Sign in as staff with the credentials from `.env` (or the
one-time password printed by `npm run db:seed`) to reach `/admin`.

| Script | What it does |
|---|---|
| `npm run dev` | Web app only |
| `npm run dev:api` | API only, with `--watch` |
| `npm run dev:full` | Both together (`scripts/dev.mjs`, no extra dependency) |
| `npm run db:migrate` / `db:seed` / `db:setup` / `db:reset` | Database lifecycle |
| `npm run typecheck` | `tsc --noEmit` for the app **and** the server |
| `npm run build` / `npm run preview` | Production bundle (the API also serves `dist/`) |
| `npm test` | Vitest: API integration + shared pricing rules |
| `powershell -File tools/smoke-api.ps1` | End-to-end API smoke run against a live server |

## 14. Environment variables

Every value has a safe development default; nothing sensitive is committed.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Enables production checks when set to `production` |
| `PORT` | `4000` | API port |
| `APP_ORIGIN` | `http://localhost:5173` | Where the web app runs |
| `DB_FILE` | `server/data/ember-oven.sqlite` | SQLite file, relative to the repo root |
| `SESSION_COOKIE_NAME` | `eo_session` | Session cookie name |
| `SESSION_TTL_HOURS` | `168` | Session lifetime |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS (required in production) |
| `STAFF_EMAIL` / `STAFF_PASSWORD` | `staff@ember-oven.local` / *generated* | Kitchen account for the seed |
| `PAYMENT_PROVIDER` | `mock` | `mock`, `razorpay` or `stripe` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `STRIPE_SECRET_KEY` | *(empty)* | Provider keys, environment only |
| `ETA_MIN_MINUTES` / `ETA_MAX_MINUTES` | `10` / `15` | The promise window the API quotes within |
| `CANCEL_WINDOW_MINUTES` | `5` | Customer cancellation grace period |
| `API_PROXY_TARGET` | `http://localhost:4000` | Vite dev-proxy target |
| `VITE_API_BASE_URL` | *(empty = same origin)* | Set only if the API is deployed separately |

`.env` is git-ignored; `.env.example` is the template that ships with the repo. The API
validates its own configuration at boot and refuses to pretend in production.

## 15. Running locally

```bash
npm run dev:full
```

- Web app: <http://localhost:5173>
- API: <http://localhost:4000> — health at `/api/health`, reporting the database driver,
  menu size and payment provider (including whether it is `live`).
- The browser only ever sees one origin: Vite proxies `/api` to the API, so session cookies
  stay first-party and no CORS setup is needed. In production the API serves the built
  `dist/` itself, for the same reason.

A typical manual pass: pick a pizza → change size/crust/cheese and watch the drawing and
the price change → add to tray → set delivery with `EMBER10` → place the order → watch the
status timeline while playing a round of Bean Rush → pay with the test provider → sign in
as staff in a second browser and move the ticket through the stations.

## 16. Testing

```bash
npm test          # 60 tests across 9 files
```

| Suite | Covers |
|---|---|
| `shared/pricing.test.ts` | Dish pricing, option deltas, GST, delivery threshold, tips, coupon caps, discount order |
| `server/tests/auth.test.ts` | Registration, duplicate email, weak password, ambiguous credentials, sign-out |
| `server/tests/profile.test.ts` | Profile edits, password rotation, account-only and staff-only guards |
| `server/tests/quoting.test.ts` | Server quoting, option deltas, invalid customisation, coupons, out-of-stock, health |
| `server/tests/orders.test.ts` | Order creation, code format, ETA window, owner scoping, guest tokens, malformed payloads |
| `server/tests/lifecycle.test.ts` | One-step status moves, no skipping/backwards, closed orders, unknown orders |
| `server/tests/cancellation.test.ts` | Grace window, preparing warning, cooking/rider refusals, refunds, staff cancel |
| `server/tests/rewards.test.ts` | Game credit applied to the bill, cap enforcement, abuse refusals |
| `server/tests/payments.test.ts` | Provider honesty, pending→paid, idempotency, failure, cancellation, ownership |

Each suite runs against a **freshly migrated and seeded throwaway database**
(`server/data/test.sqlite`), so suites are independent and the development database is never
touched. The API tests drive the real Express app through Supertest — cookies, validation
and error handling included — instead of calling services directly.

`npm run typecheck` and `npm run build` are the other two gates, and both are expected to
be clean.

## 17. Future improvements

- **Real payments.** Implement the Razorpay/Stripe provider behind the existing interface
  and confirm from a signed webhook — the route already refuses browser confirmation when a
  live provider is configured.
- **Staff accounts and audit.** Invites, per-action audit trail, end-of-shift summaries.
- **Push instead of poll.** The tracker polls every 5s; server-sent events would suit it,
  and the app is already shaped for one stream per order.
- **Notifications** when an order becomes *ready* or leaves for delivery.
- **Rider tracking** for delivery — with the same honesty rule: no fake map.
- **Kitchen printer output (KOT)** and a daily sales report from the existing tables.
- **Favourites and address book.** "Order the usual", multiple saved addresses, photos in
  order history.
- **Deployment:** one container (API serves `dist/` plus a SQLite volume) behind HTTPS with
  `COOKIE_SECURE=true`.

## API reference (summary)

| Method | Path | Access |
|---|---|---|
| `GET` | `/api/health` | public |
| `GET` | `/api/menu`, `/api/menu/items/:id` | public |
| `POST` | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | public |
| `GET` | `/api/auth/me` | public (returns `null` when signed out) |
| `PATCH` | `/api/auth/profile` · `POST /api/auth/password` | customer |
| `POST` | `/api/orders/quote` | public (prices any tray) |
| `POST` | `/api/orders` | customer or guest |
| `GET` | `/api/orders` | customer (own orders) |
| `GET` | `/api/orders/:id` | owner or guest token |
| `POST` | `/api/orders/:id/cancel` · `/rewards` | owner or guest token |
| `GET` | `/api/payments/config` | public |
| `POST` | `/api/payments` · `/api/payments/:id/confirm|fail|cancel` | order owner |
| `GET` | `/api/payments/order/:orderId` | order owner |
| `GET` | `/api/admin/orders` · `/orders/:id` · `/summary` · `/menu` | staff |
| `POST` | `/api/admin/orders/:id/status` · `/cancel` | staff |
| `PATCH` | `/api/admin/menu/:itemId/availability` | staff |

Errors are always `{ error: { code, message, details? } }` with a friendly `message`; a
stack trace, SQL statement or file path is never returned to a client.

## What is real, and what is a test flow

Being explicit, because it matters:

| Area | Status |
|---|---|
| Menu, customisation, pricing, coupons | **Real** — server-authoritative, validated on every request |
| Accounts, sessions, roles, order history | **Real** — hashed passwords, database sessions, owner-scoped reads |
| Orders, status history, cancellation rules | **Real** — persisted lifecycle with server-enforced transitions |
| Kitchen dashboard | **Real** — staff-authenticated, and it drives the customer's tracker |
| Waiting-room games and their credit | **Real** — persisted on the order and capped server-side |
| Payment gateway | **Test flow** — a local provider recording real payment *states*; no money moves, and the UI says so |
| Delivery logistics / rider tracking | **Not implemented** — the ETA is an honest estimate from prep times, and nothing pretends a courier exists |

The menu is intentionally small (pizza, fries, shakes) and is designed to grow: add an item
to `src/data/items/*`, run `npm run db:seed`, and it appears in the API, the storefront and
the customiser with no other changes.
