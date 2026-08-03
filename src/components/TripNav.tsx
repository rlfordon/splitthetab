import Link from "next/link";

const tabs = [
  { href: "", label: "Expenses" },
  { href: "/settle", label: "Settle up" },
  { href: "/people", label: "People" },
];

export function TripNav({ code, active }: { code: string; active: string }) {
  return (
    <nav className="mt-4 flex gap-1 rounded-xl bg-slate-200/70 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={`/t/${code}${tab.href}`}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium ${
            active === tab.label
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
