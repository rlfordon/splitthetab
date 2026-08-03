import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { TripHeader } from "@/components/TripHeader";
import { TripNav } from "@/components/TripNav";
import { deleteSettlement, recordSettlement } from "@/lib/actions";
import { formatCents } from "@/lib/money";
import { getTripData } from "@/lib/queries";
import { computeBalances, simplifyDebts } from "@/lib/settlement";

export default async function SettlePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getTripData(code);
  if (!data) notFound();
  const { trip, participants, expenses, settlements } = data;

  const nameOf = new Map(participants.map((p) => [p.id, p.name]));
  const balances = computeBalances(
    participants.map((p) => p.id),
    expenses,
    settlements,
  );
  const payments = simplifyDebts(balances);
  const record = recordSettlement.bind(null, trip.code);
  const maxAbs = Math.max(1, ...[...balances.values()].map((b) => Math.abs(b)));

  return (
    <main>
      <TripHeader trip={trip} />
      <TripNav code={trip.code} active="Settle up" />

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Balances</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {participants.map((p) => {
            const balance = balances.get(p.id) ?? 0;
            const width = Math.max(4, (Math.abs(balance) / maxAbs) * 100);
            return (
              <li key={p.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span
                    className={
                      balance > 0
                        ? "font-semibold text-emerald-600"
                        : balance < 0
                          ? "font-semibold text-red-600"
                          : "text-slate-500"
                    }
                  >
                    {balance > 0
                      ? `is owed ${formatCents(balance)}`
                      : balance < 0
                        ? `owes ${formatCents(-balance)}`
                        : "settled"}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div
                    className={`h-1.5 rounded-full ${
                      balance > 0 ? "bg-emerald-400" : balance < 0 ? "bg-red-400" : "bg-slate-200"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Suggested payments</h2>
        {payments.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Everyone is square — nothing to settle. 🎉
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {payments.map((payment) => (
              <li
                key={`${payment.fromId}-${payment.toId}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">
                    {nameOf.get(payment.fromId)} pays {nameOf.get(payment.toId)}
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCents(payment.amountCents)}
                  </p>
                </div>
                <form action={record}>
                  <input type="hidden" name="fromId" value={payment.fromId} />
                  <input type="hidden" name="toId" value={payment.toId} />
                  <input type="hidden" name="amountCents" value={payment.amountCents} />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white active:bg-brand-dark"
                  >
                    Mark paid
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Payments happen outside the app (Venmo, cash&hellip;) — &ldquo;Mark paid&rdquo; just
          records them here.
        </p>
      </section>

      <section className="mt-8 pb-10">
        <h2 className="text-lg font-semibold">Recorded payments</h2>
        {settlements.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">None yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {settlements.map((s) => {
              const remove = deleteSettlement.bind(null, trip.code, s.id);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm shadow-sm"
                >
                  <span>
                    <span className="font-medium">{nameOf.get(s.fromId)}</span> paid{" "}
                    <span className="font-medium">{nameOf.get(s.toId)}</span>{" "}
                    <span className="font-semibold">{formatCents(s.amountCents)}</span>
                  </span>
                  <form action={remove}>
                    <ConfirmSubmit
                      message="Remove this recorded payment?"
                      className="text-xs text-slate-400 underline"
                    >
                      Undo
                    </ConfirmSubmit>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
