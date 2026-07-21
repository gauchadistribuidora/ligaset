"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GroupTabs({
  groupId,
  isAdmin = false,
}: {
  groupId: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname() || "";
  const base = `/app/groups/${groupId}`;
  const tabs = [
    { href: base, label: "Visão geral", exact: true },
    { href: `${base}/tournaments`, label: "Torneios" },
    { href: `${base}/ranking`, label: "Ranking" },
    { href: `${base}/members`, label: "Membros" },
    { href: `${base}/payments`, label: "Financeiro" },
    ...(isAdmin ? [{ href: `${base}/relatorios`, label: "Relatórios" }] : []),
  ];

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = t.exact
          ? pathname === t.href
          : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-ocean-900 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
