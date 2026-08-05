import type { Participant } from "@/db/schema";
import { currencySymbol, minorToInputString, minorUnitDigits } from "@/lib/money";

export function ExpenseForm({
  action,
  participants,
  currency,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  participants: Participant[];
  currency: string;
  defaults: {
    description?: string;
    amountCents?: number;
    spentOn?: string;
    payerId?: number;
    sharerIds?: number[];
  };
  submitLabel: string;
}) {
  const symbol = currencySymbol(currency);
  const wholeCurrency = minorUnitDigits(currency) === 0;
  const amountDefault =
    defaults.amountCents != null
      ? minorToInputString(defaults.amountCents, currency)
      : "";
  const sharerDefault = new Set(defaults.sharerIds ?? participants.map((p) => p.id));

  return (
    <form action={action} className="mt-6 flex flex-col gap-5">
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          What was it?
        </label>
        <input
          id="description"
          name="description"
          defaultValue={defaults.description ?? ""}
          placeholder="Dinner at the crab shack"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-brand focus:outline-none"
          required
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-slate-700">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {symbol}
            </span>
            <input
              id="amount"
              name="amount"
              defaultValue={amountDefault}
              inputMode={wholeCurrency ? "numeric" : "decimal"}
              placeholder={wholeCurrency ? "4300" : "43.72"}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 focus:border-brand focus:outline-none"
              required
            />
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="spentOn" className="mb-1 block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="spentOn"
            name="spentOn"
            type="date"
            defaultValue={defaults.spentOn}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-brand focus:outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="payerId" className="mb-1 block text-sm font-medium text-slate-700">
          Who paid?
        </label>
        <select
          id="payerId"
          name="payerId"
          defaultValue={defaults.payerId}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-brand focus:outline-none"
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">
          Who&rsquo;s chipping in? <span className="text-slate-400">(split equally)</span>
        </legend>
        <div className="flex flex-col gap-1 rounded-xl border border-slate-300 bg-white p-2">
          {participants.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 active:bg-slate-50"
            >
              <input
                type="checkbox"
                name="sharerIds"
                value={p.id}
                defaultChecked={sharerDefault.has(p.id)}
                className="size-5 accent-teal-600"
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="rounded-xl bg-brand px-6 py-3 font-semibold text-white active:bg-brand-dark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
