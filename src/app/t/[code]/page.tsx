import Link from "next/link";
import { notFound } from "next/navigation";
import { TripHeader } from "@/components/TripHeader";
import { TripNav } from "@/components/TripNav";
import { pickName, switchName } from "@/lib/actions";
import { buildEntities } from "@/lib/entities";
import { getIdentity } from "@/lib/identity";
import { formatCents } from "@/lib/money";
import { getTripData } from "@/lib/queries";
import { aggregateBalances, computeBalances } from "@/lib/settlement";

export default async function TripPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getTripData(code);
  if (!data) notFound();
  const { trip, participants, paymentGroups, expenses, settlements } = data;

  const identity = await getIdentity(code);
  const me = participants.find((p) => p.id === identity) ?? null;

  if (!me) {
    const pick = pickName.bind(null, trip.code);
    return (
      <main>
        <TripHeader trip={trip} />
        <h2 className="mt-8 text-lg font-semibold">Who are you?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pick your name so the app can show your balance and pre-fill receipts.
        </p>
        <form action={pick} className="mt-4 flex flex-col gap-2">
          {participants.map((p) => (
            <button
              key={p.id}
              type="submit"
              name="participantId"
              value={p.id}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-left font-medium active:bg-teal-50"
            >
              {p.name}
            </button>
          ))}
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Not on the list?{" "}
          <Link href={`/t/${trip.code}/people`} className="text-brand-dark underline">
            Add yourself
          </Link>
        </p>
      </main>
    );
  }

  const { byKey, entityOf } = buildEntities(participants, paymentGroups);
  const balances = aggregateBalances(
    computeBalances(
      participants.map((p) => p.id),
      expenses,
      settlements,
    ),
    entityOf,
  );
  const myEntity = byKey.get(entityOf(me.id))!;
  const myBalance = balances.get(myEntity.key) ?? 0;
  const balanceLabel =
    myEntity.memberIds.length > 1 ? `${myEntity.name} are` : "You are";
  const totalSpent = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const nameOf = new Map(participants.map((p) => [p.id, p.name]));
  const switchAction = switchName.bind(null, trip.code);

  return (
    <main>
      <TripHeader trip={trip} />
      <TripNav code={trip.code} active="Expenses" />

      <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-slate-500">
              You&rsquo;re <span className="font-semibold text-slate-700">{me.name}</span>
            </p>
            <p
              className={`mt-1 text-xl font-bold ${
                myBalance > 0
                  ? "text-emerald-600"
                  : myBalance < 0
                    ? "text-red-600"
                    : "text-slate-700"
              }`}
            >
              {myBalance > 0
                ? `${balanceLabel} owed ${formatCents(myBalance)}`
                : myBalance < 0
                  ? `${myEntity.memberIds.length > 1 ? myEntity.name : "You"} owe ${formatCents(-myBalance)}`
                  : "You're all square"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Trip total</p>
            <p className="mt-1 text-xl font-bold text-slate-700">
              {formatCents(totalSpent)}
            </p>
          </div>
        </div>
        <form action={switchAction} className="mt-2">
          <button type="submit" className="text-xs text-slate-400 underline">
            Not {me.name}? Switch name
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Receipts</h2>
        {expenses.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No receipts yet — add the first one!
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {expenses.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/t/${trip.code}/expense/${e.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm active:bg-slate-50"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{e.description}</span>
                    <span className="font-semibold">{formatCents(e.amountCents)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {nameOf.get(e.payerId)} paid &middot; {e.spentOn} &middot; split{" "}
                    {e.sharerIds.length === participants.length
                      ? "between everyone"
                      : `between ${e.sharerIds
                          .map((id) => nameOf.get(id))
                          .filter(Boolean)
                          .join(", ")}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/t/${trip.code}/expense/new`}
        className="fixed bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl bg-brand px-6 py-4 text-center text-lg font-semibold text-white shadow-lg active:bg-brand-dark"
      >
        + Add receipt
      </Link>
    </main>
  );
}
