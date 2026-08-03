import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Trip not found</h1>
      <p className="text-slate-600">
        That trip code doesn&rsquo;t exist — check it with whoever created the trip.
      </p>
      <Link href="/" className="font-semibold text-brand-dark underline">
        Back to home
      </Link>
    </main>
  );
}
