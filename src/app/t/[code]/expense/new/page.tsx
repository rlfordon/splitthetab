import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/ExpenseForm";
import { createExpense } from "@/lib/actions";
import { getIdentity } from "@/lib/identity";
import { getTripData } from "@/lib/queries";

export default async function NewExpense({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ code }, { error }] = await Promise.all([params, searchParams]);
  const data = await getTripData(code);
  if (!data) notFound();

  const identity = await getIdentity(code);
  const today = new Date().toISOString().slice(0, 10);
  const action = createExpense.bind(null, data.trip.code);

  return (
    <main className="py-8">
      <Link href={`/t/${data.trip.code}`} className="text-sm text-slate-500">
        &larr; {data.trip.name}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Add receipt</h1>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      <ExpenseForm
        action={action}
        participants={data.participants}
        defaults={{
          spentOn: today,
          payerId: identity ?? undefined,
        }}
        submitLabel="Save receipt"
      />
    </main>
  );
}
