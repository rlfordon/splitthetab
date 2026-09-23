# 🧾 SplitTheTab

**Split trip expenses with family and friends — no accounts, no math, no
awkwardness.**

Everyone enters their receipts during the trip; at the end (or any time), the
app tells you exactly who pays whom, in the fewest possible payments.

**Live app:** [splitthetab.rlfordon.workers.dev](https://splitthetab.rlfordon.workers.dev)

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

Next.js (App Router) · Tailwind CSS · Drizzle ORM · Cloudflare D1 (SQLite) —
deployed on [Cloudflare Workers](https://workers.cloudflare.com) with the
[OpenNext adapter](https://opennext.js.org/cloudflare). It runs on Cloudflare's
free plan: no monthly fee, no cold starts, and the database keeps its data
between trips. See [DESIGN.md](./DESIGN.md) for the data model, settlement
algorithm, and design decisions.

### Local development

Requires Node 22+.

```bash
npm install
npm run db:migrate:local   # creates a local D1 database under .wrangler/
npm run dev                # http://localhost:3000
```

`npm run preview` runs the production build locally in the Workers runtime.
Run the settlement-math tests with `npm test`.

### Deploying your own (one-time setup)

1. **Create the database.** In the Cloudflare dashboard: **Storage & Databases →
   D1 → Create**, name it `splitthetab`. Copy its **Database ID** into
   `wrangler.jsonc` (`database_id`) and commit.
   (CLI alternative: `npx wrangler d1 create splitthetab`.)
2. **Connect the repo.** **Workers & Pages → Create → Import a repository**, pick
   this repo, and set:
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler d1 migrations apply splitthetab --remote && npx opennextjs-cloudflare deploy`

   Every push to `main` then builds, applies any new migrations, and deploys.
3. The app is served at `https://splitthetab.<your-subdomain>.workers.dev`.

### Database changes

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate        # writes a new SQL migration to migrations/
npm run db:migrate:local   # try it locally
```

Commit the generated migration; the deploy command applies it to the live database.

### Backups

```bash
npm run db:backup   # npx wrangler d1 export splitthetab --remote --output=backup.sql
```

D1 also keeps point-in-time history (7 days on the free plan) (**D1 → splitthetab → Time Travel**).

### Moving data from the old Railway Postgres (one time)

The app used to run on Railway with Postgres. To bring existing trips over,
after the D1 database exists and has its migrations applied (steps above):

```bash
# DATABASE_URL: Railway → Postgres service → Variables → DATABASE_PUBLIC_URL
DATABASE_URL='postgresql://…' node scripts/export-from-postgres.mjs > export.sql
npx wrangler d1 execute splitthetab --remote --file=export.sql
```

Trip codes and ids are preserved, so old trip links keep working on the new
domain. Run it once, against an empty database, then shut down the Railway project.

## License

[MIT](./LICENSE)
