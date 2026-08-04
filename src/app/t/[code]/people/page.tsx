import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { TripHeader } from "@/components/TripHeader";
import { TripNav } from "@/components/TripNav";
import {
  addParticipant,
  createPaymentGroup,
  deletePaymentGroup,
  renameParticipant,
} from "@/lib/actions";
import { getTripData } from "@/lib/queries";

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ code }, { error }] = await Promise.all([params, searchParams]);
  const data = await getTripData(code);
  if (!data) notFound();
  const { trip, participants, paymentGroups, expenses } = data;

  const add = addParticipant.bind(null, trip.code);
  const rename = renameParticipant.bind(null, trip.code);
  const createGroup = createPaymentGroup.bind(null, trip.code);
  const expenseCount = (id: number) =>
    expenses.filter((e) => e.payerId === id || e.sharerIds.includes(id)).length;
  const ungrouped = participants.filter((p) => p.paymentGroupId === null);

  return (
    <main>
      <TripHeader trip={trip} />
      <TripNav code={trip.code} active="People" />
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">On this trip</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {participants.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">
                  {p.name}
                  {p.paymentGroupId !== null && (
                    <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-normal text-teal-700">
                      {paymentGroups.find((g) => g.id === p.paymentGroupId)?.name}
                    </span>
                  )}
                </span>
                <span className="text-sm text-slate-500">
                  {expenseCount(p.id)} receipt{expenseCount(p.id) === 1 ? "" : "s"}
                </span>
              </div>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-slate-400">
                  Rename
                </summary>
                <form action={rename} className="mt-2 flex gap-2">
                  <input type="hidden" name="participantId" value={p.id} />
                  <input
                    name="name"
                    defaultValue={p.name}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white active:bg-slate-800"
                  >
                    Save
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pay together</h2>
        <p className="mt-1 text-sm text-slate-600">
          Couples or families with a shared wallet settle up as one. Everyone
          still gets checked into receipts individually.
        </p>

        {paymentGroups.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {paymentGroups.map((g) => {
              const members = participants.filter((p) => p.paymentGroupId === g.id);
              const remove = deletePaymentGroup.bind(null, trip.code, g.id);
              return (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium">{g.name}</p>
                    <p className="text-sm text-slate-500">
                      {members.map((m) => m.name).join(", ")}
                    </p>
                  </div>
                  <form action={remove}>
                    <ConfirmSubmit
                      message={`Split up ${g.name}? Members go back to settling individually.`}
                      className="text-xs text-slate-400 underline"
                    >
                      Ungroup
                    </ConfirmSubmit>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {ungrouped.length >= 2 && (
          <details className="mt-3 rounded-xl border border-slate-300 bg-white p-4">
            <summary className="cursor-pointer font-medium text-brand-dark">
              + New group
            </summary>
            <form action={createGroup} className="mt-3 flex flex-col gap-3">
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-slate-700">
                  Who pays together?
                </legend>
                <div className="flex flex-col gap-1">
                  {ungrouped.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 active:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        name="memberIds"
                        value={p.id}
                        className="size-5 accent-teal-600"
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <input
                name="name"
                placeholder="Group name (optional — e.g. The Smiths)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-brand px-6 py-3 font-semibold text-white active:bg-brand-dark"
              >
                Create group
              </button>
            </form>
          </details>
        )}
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
