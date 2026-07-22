import Link from "next/link";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  url,
  size = 40,
  color = "#0c1b2a",
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
  color?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name ?? ""}
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-slate-200"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full font-bold uppercase text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center py-10 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-bold text-slate-800">{title}</h3>
      {desc && <p className="mt-1 max-w-xs text-sm text-slate-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-1 inline-block text-sm text-slate-400">
            ← Voltar
          </Link>
        )}
        <h1 className="truncate text-2xl font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="stat-card">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className={`mt-1 font-black text-slate-900 ${
          valueClassName ?? "text-2xl"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
