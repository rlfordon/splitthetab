# SplitTheTab

Split trip expenses with family and friends. Create a trip, share the short
code, everyone enters their receipts and checks off who's chipping in, and the
app works out the minimum set of payments to settle up.

See [DESIGN.md](./DESIGN.md) for the full design.

## Stack

Next.js (App Router) · Tailwind CSS · Drizzle ORM · PostgreSQL

## Local development

Requires Node 20+ and a Postgres database.

```bash
npm install
echo 'DATABASE_URL=postgresql://user:pass@localhost:5432/splitthetab' > .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/splitthetab npm run db:migrate
npm run dev
```

Then open http://localhost:3000.

Run the settlement-math unit tests with:

```bash
npm test
```

## Deploying to Railway

1. Create a new Railway project and add a service **from this GitHub repo**.
2. In the same project, add a **PostgreSQL** database (Add service → Database
   → PostgreSQL).
3. On the app service, add a variable that references the database:
   `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`.
4. Deploy. `railway.json` takes care of the rest: migrations run as the
   pre-deploy command (`npm run db:migrate`) before each release starts.
5. Under the app service's **Settings → Networking**, generate a public
   domain. That URL is what you share with your group.

Pushing to the connected branch redeploys automatically.

## Database changes

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate   # writes a new SQL migration to drizzle/
npm run db:migrate    # applies it (uses DATABASE_URL)
```

Commit the generated migration files — Railway applies them on deploy.
