import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ExpenseForm } from "@/components/ExpenseForm";
import { deleteExpense, updateExpense } from "@/lib/actions";
import { getTripData } from "@/lib/queries";

export default async function EditExpense({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ code, id }, { error }] = await Promise.all([params, searchParams]);
  const data = await getTripData(code);
  if (!data) notFound();

  const expenseId = parseInt(id, 10);
  const expense = data.expenses.find((e) => e.id === expenseId);
  if (!expense) notFound();

  const update = updateExpense.bind(null, data.trip.code, expense.id);
  const remove = deleteExpense.bind(null, data.trip.code, expense.id);

  return (
    <main className="py-8">
      <Link href={`/t/${data.trip.code}`} className="text-sm text-slate-500">
        &larr; {data.trip.name}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Edit receipt</h1>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      <ExpenseForm
        action={update}
        participants={data.participants}
        currency={data.trip.currency}
        defaults={{
          description: expense.description,
          amountCents: expense.amountCents,
          spentOn: expense.spentOn,
          payerId: expense.payerId,
          sharerIds: expense.sharerIds,
        }}
        submitLabel="Save changes"
      />
      <form action={remove} className="mt-4">
        <ConfirmSubmit
          message="Delete this receipt? This can't be undone."
          className="w-full rounded-xl border border-red-200 px-6 py-3 font-semibold text-red-600 active:bg-red-50"
        >
          Delete receipt
        </ConfirmSubmit>
      </form>
    </main>
  );
}
