# 🧾 SplitTheTab

**Split trip expenses with family and friends — no accounts, no math, no
awkwardness.**

Everyone enters their receipts during the trip; at the end (or any time), the
app tells you exactly who pays whom, in the fewest possible payments.

**Live app:** [splitthetab-production.up.railway.app](https://splitthetab-production.up.railway.app)

## Features

- 🔗 **No accounts.** Create a trip, get a short code like `BCH24X`, share it.
  Everyone opens the link, taps their own name, and they're in.
- 🧾 **Fast receipt entry.** Description, amount, who paid, and checkboxes
  for who's chipping in — split equally, exact to the cent.
- 👫 **Pay together.** Group a couple or family into one shared wallet:
  they're still checked into receipts individually, but they settle up as
  one, and debts between them cancel automatically.
- 💸 **Smart settle-up.** Balances are netted into the minimum set of
  payments ("Sam pays Alex $73.50"). Mark payments as made and watch
  balances tick down to zero.
- 🌍 **Any currency.** Pick the trip's currency at creation (default USD) —
  euros, pounds, yen, and 18 more, all formatted correctly.
- ✏️ **Fix anything.** Anyone on the trip can edit or delete any receipt,
  add late joiners, or regroup people — the math recomputes instantly.
- 📱 **Built for phones.** Enter a receipt one-handed at the restaurant.

## How to use it

**Setting up a trip (once, by anyone):**

1. Open the app and tap **Start a new trip**.
2. Name the trip, list everyone going (one name per line), pick a currency.
3. You'll land on the trip page — send the trip code (or just the URL) to
   the group chat.

**During the trip (everyone):**

1. Open the trip, tap your name (your phone remembers it).
2. Paid for something? Tap **+ Add receipt**: what it was, how much, and
   check off who's in on it. Twenty seconds, done.
3. Couples or families who share money: on the **People** tab, create a
   "pay together" group once, and the app treats them as one wallet.

**Settling up (end of trip, or whenever):**

1. Open the **Settle up** tab.
2. It shows everyone's balance and the shortest list of payments to zero
   everything out.
3. Pay each other however you like (Venmo, cash...), tap **Mark paid** on
   each, and the trip closes itself out. 🎉

## Tech

Next.js (App Router) · Tailwind CSS · Drizzle ORM · PostgreSQL — deployed on
[Railway](https://railway.com). See [DESIGN.md](./DESIGN.md) for the data
model, settlement algorithm, and design decisions.

### Local development

Requires Node 22+ and a Postgres database.

```bash
npm install
echo 'DATABASE_URL=postgresql://user:pass@localhost:5432/splitthetab' > .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/splitthetab npm run db:migrate
npm run dev
```

Then open http://localhost:3000. Run the settlement-math tests with `npm test`.

### Deploying your own

1. Create a Railway project → **Deploy from GitHub repo** → pick your fork.
2. In the same project: **Create → Database → Add PostgreSQL**.
3. On the app service, set `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   (the services must be in the same project).
4. **Settings → Networking → Generate Domain** and share the URL.

The start command runs database migrations before launching, so pushes to
`main` deploy and migrate automatically.

### Database changes

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate   # writes a new SQL migration to drizzle/
npm run db:migrate    # applies it (uses DATABASE_URL)
```

Commit the generated migration files — they're applied on deploy.

## License

[MIT](./LICENSE)
