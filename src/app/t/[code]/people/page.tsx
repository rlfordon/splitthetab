import { notFound } from "next/navigation";
import { TripHeader } from "@/components/TripHeader";
import { TripNav } from "@/components/TripNav";
import { addParticipant } from "@/lib/actions";
import { getTripData } from "@/lib/queries";

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getTripData(code);
  if (!data) notFound();
  const { trip, participants, expenses } = data;

  const add = addParticipant.bind(null, trip.code);
  const expenseCount = (id: number) =>
    expenses.filter((e) => e.payerId === id || e.sharerIds.includes(id)).length;

  return (
    <main>
      <TripHeader trip={trip} />
      <TripNav code={trip.code} active="People" />

      <section className="mt-6">
        <h2 className="text-lg font-semibold">On this trip</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between rounded-xl bg-white p-4 shadow-sm"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-slate-500">
                {expenseCount(p.id)} receipt{expenseCount(p.id) === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 pb-10">
        <h2 className="text-lg font-semibold">Add someone</h2>
        <p className="mt-1 text-sm text-slate-600">
          Late joiners only owe on receipts they&rsquo;re checked into.
        </p>
        <form action={add} className="mt-3 flex gap-2">
          <input
            name="name"
            placeholder="Name"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-brand focus:outline-none"
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white active:bg-brand-dark"
          >
            Add
          </button>
        </form>
      </section>
    </main>
  );
}
