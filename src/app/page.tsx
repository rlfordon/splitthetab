import Link from "next/link";
import { joinTrip } from "@/lib/actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-brand-dark">
          SplitTheTab
        </h1>
        <p className="mt-2 text-slate-600">
          Track trip expenses together, settle up at the end.
        </p>
      </div>

      <form action={joinTrip} className="flex flex-col gap-3">
        <label htmlFor="code" className="text-sm font-medium text-slate-700">
          Have a trip code?
        </label>
        <div className="flex gap-2">
          <input
            id="code"
            name="code"
            defaultValue={code ?? ""}
            placeholder="e.g. BCH24X"
            autoCapitalize="characters"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg uppercase tracking-widest focus:border-brand focus:outline-none"
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white active:bg-brand-dark"
          >
            Join
          </button>
        </div>
        {error === "notfound" && (
          <p className="text-sm text-red-600">
            No trip found with that code — double-check it with whoever created the trip.
          </p>
        )}
      </form>

      <div className="flex items-center gap-3 text-sm text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <Link
        href="/new"
        className="rounded-xl border-2 border-brand px-6 py-3 text-center font-semibold text-brand-dark active:bg-teal-50"
      >
        Start a new trip
      </Link>
    </main>
  );
}
