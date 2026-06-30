export function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function shortDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function monthLabel(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function displayName(p?: { full_name: string | null } | null): string {
  return p?.full_name?.trim() || "Jogador";
}

export const PAYMENT_LABEL: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
  exempt: "Isento",
};

export const PAYMENT_STYLE: Record<string, string> = {
  paid: "bg-court-100 text-court-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-rose-100 text-rose-700",
  exempt: "bg-slate-100 text-slate-600",
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  player: "Jogador",
};
