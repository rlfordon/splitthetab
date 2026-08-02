# SplitTheTab — Design Sketch

A small web app for splitting expenses on a group trip. Built for a trusted
circle of family and friends: low friction beats airtight security everywhere
a tradeoff exists.

## Requirements (from interview)

- **Multiple trips.** Each trip has its own participants and expenses. A trip
  is reached by a short shareable code (e.g. `BEACH24`).
- **Identity = trip code + pick your name.** No accounts or passwords. The
  trip code gates entry; once in, you pick your name from the participant
  list. Your choice is remembered on your device.
- **Receipts (expenses).** Description, amount, date, who paid, and who's
  chipping in. **Equal split** among the selected people. No photo
  attachments. USD only.
- **Anyone on the trip can edit or delete any receipt** (honor system).
- **Settlement: simplified debts.** At any point (not just trip end) the app
  nets all balances and shows the minimum set of payments — "Sam pays
  Alex $73.50."
- **Settle-up tracking.** Payments can be recorded in the app so outstanding
  balances tick down to zero.
- **Free cloud hosting**, reachable from everyone's phones. Mobile-first UI.

Out of scope (deliberately): user accounts, receipt photos/OCR, multi-currency,
unequal splits, notifications, payment-provider integration (people settle via
Venmo/cash outside the app).

## Stack

Boring, well-supported, free to run:

| Layer     | Choice                                   | Why |
|-----------|------------------------------------------|-----|
| Framework | **Next.js (App Router, TypeScript)**     | One codebase for UI + API routes; first-class Vercel deploys. |
| Styling   | **Tailwind CSS**                         | Fast to build a clean mobile-first UI. |
| Database  | **Postgres on Neon (free tier)**         | Vercel's filesystem is ephemeral, so SQLite won't persist; Neon's serverless Postgres free tier is plenty for this workload. |
| ORM       | **Drizzle**                              | Lightweight, typed schema + migrations. |
| Hosting   | **Vercel (free tier)**                   | Push-to-deploy from GitHub; HTTPS URL for the group. |

No auth library needed: the trip code is the credential, and the picked name
is stored in a cookie/localStorage per trip.

## Data model

All money is stored as **integer cents** to avoid float drift.

```
trips
  id           serial PK
  code         text UNIQUE   -- short human-friendly code, e.g. "BEACH24"
  name         text          -- "Outer Banks 2026"
  created_at   timestamptz

participants
  id           serial PK
  trip_id      FK -> trips
  name         text          -- unique per trip
  UNIQUE (trip_id, name)

expenses
  id           serial PK
  trip_id      FK -> trips
  payer_id     FK -> participants   -- who fronted the money
  description  text
  amount_cents integer
  spent_on     date
  created_by   FK -> participants   -- who entered it (audit only)
  created_at   timestamptz

expense_shares                      -- who's chipping in on this receipt
  expense_id      FK -> expenses
  participant_id  FK -> participants
  PK (expense_id, participant_id)

settlements                         -- recorded settle-up payments
  id           serial PK
  trip_id      FK -> trips
  from_id      FK -> participants
  to_id        FK -> participants
  amount_cents integer
  created_at   timestamptz
```

Notes:
- The payer may or may not be among the sharers (e.g. Mom pays for the kids'
  tickets but isn't going herself) — both cases fall out naturally.
- Deleting a participant is only allowed if they appear on no expenses or
  settlements; otherwise the UI offers to keep them but hide them from new
  receipts.

## Settlement math

1. **Per-expense split.** `share = amount_cents / n` sharers, integer
   division; the remainder cents are assigned one each to the first
   `amount % n` sharers in a stable order (participant id), so splits are
   deterministic and always sum exactly to the receipt total.
2. **Net balance per person.**
   `balance = (total paid) − (total owed as a sharer)
              + (settlements sent) − (settlements received)`
   Positive → the group owes them; negative → they owe the group. Balances
   always sum to zero.
3. **Simplified debts (greedy matching).** Repeatedly match the largest
   debtor with the largest creditor and transfer `min(|debt|, credit)`. For a
   group of n people this yields at most n−1 payments, which is what people
   actually want to Venmo. Recomputed live from source data on every view —
   nothing about balances is stored, so edits/deletes always stay consistent.

## Pages & flow

```
/                         Home: "Create a trip" or "Enter trip code"
/new                      Create trip: name + participant names → generates code
/t/[code]                 Join gate (first visit): pick your name → cookie
/t/[code]                 Trip dashboard (after join):
                            - running total spent, your balance at a glance
                            - expense list (newest first, payer + sharers)
                            - big "+ Add expense" button
/t/[code]/expense/new     Add expense: description, amount, date (default
                            today), payer (default you), sharer checkboxes
                            (default everyone)
/t/[code]/expense/[id]    Edit / delete expense
/t/[code]/settle          Settle up:
                            - net balance per person (bar list, +/- colored)
                            - "Suggested payments" (simplified debts) with a
                              "Mark paid" button on each
                            - history of recorded settlements (deletable if
                              entered by mistake)
/t/[code]/people          Manage participants (add late joiners, rename)
```

UX details:
- Mobile-first; everything usable one-handed at a restaurant.
- Amount input uses a numeric keypad and accepts `43.72`-style entry.
- "Mark paid" on a suggested payment creates a `settlements` row for exactly
  that amount; partial payments can be entered manually.
- The dashboard shows *your* position ("You are owed $31.20") using the name
  cookie, since that's the question everyone actually has.

## API surface (Next.js route handlers)

```
POST   /api/trips                     create trip (+ participants) → code
GET    /api/trips/[code]              trip + participants + expenses + settlements
POST   /api/trips/[code]/participants
PATCH  /api/participants/[id]
POST   /api/trips/[code]/expenses
PATCH  /api/expenses/[id]
DELETE /api/expenses/[id]
GET    /api/trips/[code]/settlement   computed balances + suggested payments
POST   /api/trips/[code]/settlements  record a payment
DELETE /api/settlements/[id]
```

Every route requires the trip code in the path and verifies it exists — that's
the entire authorization model, by design.

## Build plan

1. **Scaffold** — Next.js + Tailwind + Drizzle + Neon; schema + migrations.
2. **Trips & join flow** — create trip, code generation, name picker + cookie.
3. **Expenses** — add/edit/delete, list view, equal-split share storage.
4. **Settlement** — balance computation, greedy simplification, settle-up
   recording. Unit tests on the math (rounding, zero-sum invariant).
5. **Polish & deploy** — mobile styling, empty states, deploy to Vercel,
   connect Neon, smoke-test from a phone.
