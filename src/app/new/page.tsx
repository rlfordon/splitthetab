import Link from "next/link";
import { createTrip } from "@/lib/actions";

export default function NewTrip() {
  return (
    <main className="py-8">
      <Link href="/" className="text-sm text-slate-500">
        &larr; Back
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Start a new trip</h1>
      <p className="mt-1 text-sm text-slate-600">
        You&rsquo;ll get a short code to share with everyone.
      </p>

      <form action={createTrip} className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Trip name
          </label>
          <input
            id="name"
            name="name"
            placeholder="Outer Banks 2026"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-brand focus:outline-none"
            required
          />
        </div>

        <div>
          <label
            htmlFor="participants"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Who&rsquo;s on the trip? <span className="text-slate-400">(one name per line)</span>
          </label>
          <textarea
            id="participants"
            name="participants"
            rows={6}
            placeholder={"Alex\nSam\nJordan"}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-brand focus:outline-none"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            You can add late joiners any time.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-brand px-6 py-3 font-semibold text-white active:bg-brand-dark"
        >
          Create trip
        </button>
      </form>
    </main>
  );
}
