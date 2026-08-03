import type { Trip } from "@/db/schema";

export function TripHeader({ trip }: { trip: Trip }) {
  return (
    <header className="pt-6">
      <h1 className="text-2xl font-bold">{trip.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Trip code: <span className="font-mono font-semibold tracking-widest text-slate-700">{trip.code}</span>
        <span className="ml-1">— share it so others can join</span>
      </p>
    </header>
  );
}
