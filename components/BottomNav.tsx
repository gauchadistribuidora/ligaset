"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Início", icon: "🏠", match: (p: string) => p === "/app" },
  { href: "/app/groups", label: "Grupos", icon: "👥", match: (p: string) => p.startsWith("/app/groups") },
  { href: "/app/profile", label: "Perfil", icon: "👤", match: (p: string) => p.startsWith("/app/profile") },
];

export default function BottomNav() {
  const pathname = usePathname() || "/app";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                active ? "text-court-600" : "text-slate-400"
              }`}
            >
              <span className="text-lg">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
