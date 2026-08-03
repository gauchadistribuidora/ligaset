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

// Conectores de nome brasileiro que ficam em minúscula no meio do nome.
const NAME_CONNECTORS = new Set([
  "de", "da", "das", "do", "dos", "e", "di", "del", "van", "von", "y",
]);

// "andre fiusa" -> "Andre Fiusa" | "MARIA DE SOUZA" -> "Maria de Souza".
// Usado em todo cadastro de nome para o relatório não tratar o mesmo jogador
// como duas pessoas por causa de maiúscula/minúscula.
export function properName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && NAME_CONNECTORS.has(lower)) return lower;
      // Respeita nomes compostos por hífen ou apóstrofo: Jean-Pierre, D'Ávila.
      return lower.replace(
        /(^|[-'’])([\p{L}])/gu,
        (_, sep: string, letter: string) => sep + letter.toUpperCase()
      );
    })
    .join(" ");
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

export const MODALITY_LABEL: Record<string, string> = {
  beach: "Beach Tennis",
  padel: "Padel",
  volei: "Vôlei",
  futevolei: "Futevôlei",
  tenis: "Tênis",
};

export const MODALITY_OPTIONS: [string, string][] = [
  ["beach", "Beach Tennis"],
  ["padel", "Padel"],
  ["volei", "Vôlei"],
  ["futevolei", "Futevôlei"],
  ["tenis", "Tênis"],
];

export const BR_STATES: [string, string][] = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"],
  ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"],
  ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"],
  ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"],
  ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"],
  ["TO", "Tocantins"],
];

export const SIGNUP_SPORTS: string[] = [
  "Beach Tennis",
  "Padel",
  "Vôlei",
  "Futevôlei",
];
