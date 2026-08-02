// Regras dos torneios externos — os que o jogador disputa fora do Ligaset.

export const PHASES = ["group", "r32", "r16", "qf", "sf", "final"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABEL: Record<Phase, string> = {
  group: "Fase de grupos",
  r32: "16 avos de final",
  r16: "Oitavas de final",
  qf: "Quartas de final",
  sf: "Semifinal",
  final: "Final",
};

export const PHASE_SHORT: Record<Phase, string> = {
  group: "Grupos",
  r32: "16 avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinal",
  final: "Final",
};

// Usado no botão "Avançou para as quartas".
export const PHASE_TO: Record<Phase, string> = {
  group: "a fase de grupos",
  r32: "os 16 avos",
  r16: "as oitavas",
  qf: "as quartas",
  sf: "a semifinal",
  final: "a final",
};

// Usado no texto "parou nas quartas", "parou na fase de grupos".
const PHASE_IN: Record<Phase, string> = {
  group: "na fase de grupos",
  r32: "nos 16 avos",
  r16: "nas oitavas",
  qf: "nas quartas",
  sf: "na semifinal",
  final: "na final",
};

export function isPhase(v: string): v is Phase {
  return (PHASES as readonly string[]).includes(v);
}

export function phaseOrder(p: string): number {
  return (PHASES as readonly string[]).indexOf(p);
}

export function nextPhase(p: string): Phase | null {
  const i = phaseOrder(p);
  if (i < 0 || i >= PHASES.length - 1) return null;
  return PHASES[i + 1];
}

// ---------- categorias ----------

export const CATEGORY_LEVELS = ["Pro", "A", "B", "C", "D", "Iniciante"] as const;
export const CATEGORY_GENDERS = ["Masculina", "Feminina", "Mista"] as const;

// "B" + "Feminina" = "B Feminina". É essa string que fica gravada e é por ela
// que os relatórios agrupam.
export function composeCategory(level: string, gender: string): string | null {
  const parts = [level.trim(), gender.trim()].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export function splitCategory(category: string | null): {
  level: string;
  gender: string;
} {
  if (!category) return { level: "", gender: "" };
  const gender =
    (CATEGORY_GENDERS as readonly string[]).find((g) =>
      category.endsWith(g)
    ) ?? "";
  const level = category.slice(0, category.length - gender.length).trim();
  return { level, gender };
}

// ---------- federações ----------

// As conhecidas ficam prontas na tela; qualquer outra pode ser digitada.
export const FEDERATIONS = ["FGT", "FGBT", "CBT"] as const;

// Um torneio que se repete ao longo do ano — mesmo nome, datas diferentes.
// A lista sai dos torneios que o jogador já cadastrou.
export type ExternalEvent = {
  name: string;
  federation: string | null;
};

// ---------- duplas adversárias ----------

export type ExternalPair = {
  id: string;
  player1: string;
  player2: string;
};

// Grava sempre na mesma ordem, para "Ana/Bia" e "Bia/Ana" serem a mesma dupla.
export function normalizePair(a: string, b: string): [string, string] {
  const x = a.trim();
  const y = b.trim();
  return x.localeCompare(y, "pt-BR") <= 0 ? [x, y] : [y, x];
}

export function pairLabel(p: { player1: string; player2: string }): string {
  return `${p.player1} / ${p.player2}`;
}

export type ExternalTournament = {
  id: string;
  name: string;
  tournament_date: string | null;
  category: string | null;
  partner_name: string | null;
  status: "planned" | "ongoing" | "finished";
  current_phase: Phase;
  final_phase: Phase | null;
  champion: boolean;
};

export type ExternalMatch = {
  id: string;
  tournament_id: string;
  phase: Phase;
  opponent1: string | null;
  opponent2: string | null;
  set_scores: number[][];
  games_for: number;
  games_against: number;
  won: boolean;
};

// Como o torneio terminou — é isso que aparece no relatório
// "Torneio Open: Campeão / Torneio Radar: Semifinal".
export function resultLabel(t: {
  status: string;
  champion: boolean;
  final_phase: string | null;
}): string {
  if (t.status === "planned") return "Agendado";
  if (t.status !== "finished") return "Em andamento";
  if (t.champion) return "Campeão";
  if (t.final_phase === "final") return "Vice-campeão";
  if (!t.final_phase || !isPhase(t.final_phase)) return "Encerrado";
  return `Parou ${PHASE_IN[t.final_phase]}`;
}

// Versão curta para tabela e chip.
export function resultShort(t: {
  status: string;
  champion: boolean;
  final_phase: string | null;
}): string {
  if (t.status === "planned") return "Agendado";
  if (t.status !== "finished") return "Em andamento";
  if (t.champion) return "Campeão";
  if (t.final_phase === "final") return "Vice";
  if (!t.final_phase || !isPhase(t.final_phase)) return "Encerrado";
  return PHASE_SHORT[t.final_phase];
}

export function resultStyle(t: {
  status: string;
  champion: boolean;
  final_phase: string | null;
}): string {
  if (t.champion) return "bg-amber-100 text-amber-700";
  if (t.status === "ongoing") return "bg-court-100 text-court-700";
  if (t.status === "planned") return "bg-ocean-900/5 text-ocean-900";
  return "bg-slate-100 text-slate-600";
}

// ---------- placar ----------

// Aceita o que vem do banco (jsonb) e devolve sempre pares [nossos, deles].
export function parseSets(raw: unknown): number[][] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is number[] => Array.isArray(s) && s.length >= 2)
    .map((s) => [Number(s[0]) || 0, Number(s[1]) || 0]);
}

export function formatSets(sets: number[][]): string {
  if (!sets.length) return "—";
  return sets.map(([a, b]) => `${a}-${b}`).join(", ");
}

export function gamesFromSets(sets: number[][]): {
  gamesFor: number;
  gamesAgainst: number;
} {
  return sets.reduce(
    (acc, [a, b]) => ({
      gamesFor: acc.gamesFor + a,
      gamesAgainst: acc.gamesAgainst + b,
    }),
    { gamesFor: 0, gamesAgainst: 0 }
  );
}

// Vencemos se ganhamos mais sets. Empate de sets cai no saldo de games.
export function wonFromSets(sets: number[][]): boolean {
  let mine = 0;
  let theirs = 0;
  for (const [a, b] of sets) {
    if (a > b) mine++;
    else if (b > a) theirs++;
  }
  if (mine !== theirs) return mine > theirs;
  const { gamesFor, gamesAgainst } = gamesFromSets(sets);
  return gamesFor > gamesAgainst;
}

export function opponentLabel(m: {
  opponent1: string | null;
  opponent2: string | null;
}): string {
  const names = [m.opponent1, m.opponent2].map((n) => n?.trim()).filter(Boolean);
  return names.length ? names.join(" / ") : "Adversário não informado";
}

// ---------- estatísticas ----------

export type Tally = {
  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
};

export const emptyTally = (): Tally => ({
  played: 0,
  wins: 0,
  losses: 0,
  gamesFor: 0,
  gamesAgainst: 0,
});

export function addToTally(t: Tally, m: ExternalMatch): Tally {
  return {
    played: t.played + 1,
    wins: t.wins + (m.won ? 1 : 0),
    losses: t.losses + (m.won ? 0 : 1),
    gamesFor: t.gamesFor + (m.games_for ?? 0),
    gamesAgainst: t.gamesAgainst + (m.games_against ?? 0),
  };
}

export function winRate(t: Tally): number {
  return t.played ? Math.round((t.wins / t.played) * 100) : 0;
}

export function balance(t: Tally): number {
  return t.gamesFor - t.gamesAgainst;
}

// Mínimo de jogos para um parceiro entrar no ranking de melhor/pior dupla.
// Sem isso, quem jogou uma única partida e venceu apareceria com 100%.
export const MIN_MATCHES_RANKING = 3;

// Contra a mesma dupla a gente joga menos vezes que com o mesmo parceiro,
// então aqui o mínimo é menor.
export const MIN_MATCHES_OPPONENT = 2;

export type OpponentStats = Tally & { opponent: string };

// Freguês e carrasco: contra quais duplas você mais vence e mais perde.
export function opponentRanking(matches: ExternalMatch[]): {
  ranked: OpponentStats[];
  few: OpponentStats[];
} {
  const map = new Map<string, Tally>();
  for (const m of matches) {
    const [a, b] = normalizePair(m.opponent1 ?? "", m.opponent2 ?? "");
    const key = [a, b].filter(Boolean).join(" / ");
    if (!key) continue;
    map.set(key, addToTally(map.get(key) ?? emptyTally(), m));
  }

  const all: OpponentStats[] = [...map.entries()].map(([opponent, t]) => ({
    opponent,
    ...t,
  }));

  const sorter = (a: OpponentStats, b: OpponentStats) =>
    winRate(b) - winRate(a) ||
    balance(b) - balance(a) ||
    b.played - a.played ||
    a.opponent.localeCompare(b.opponent, "pt-BR");

  return {
    ranked: all.filter((o) => o.played >= MIN_MATCHES_OPPONENT).sort(sorter),
    few: all
      .filter((o) => o.played < MIN_MATCHES_OPPONENT)
      .sort((a, b) => a.opponent.localeCompare(b.opponent, "pt-BR")),
  };
}

export type CategoryStats = Tally & { category: string; titles: number };

// Como você vai em cada categoria — ajuda a decidir onde se inscrever.
export function categoryRanking(
  tournaments: {
    category: string | null;
    champion: boolean;
    matches: ExternalMatch[];
  }[]
): CategoryStats[] {
  const map = new Map<string, CategoryStats>();
  for (const t of tournaments) {
    const key = t.category?.trim() || "Sem categoria";
    const cur =
      map.get(key) ?? ({ category: key, titles: 0, ...emptyTally() } as CategoryStats);
    let tally: Tally = cur;
    for (const m of t.matches) tally = addToTally(tally, m);
    map.set(key, {
      ...cur,
      ...tally,
      category: key,
      titles: cur.titles + (t.champion ? 1 : 0),
    });
  }
  return [...map.values()]
    .filter((c) => c.played > 0)
    .sort((a, b) => winRate(b) - winRate(a) || balance(b) - balance(a));
}

export type PartnerStats = Tally & { partner: string };

export function partnerRanking(
  matchesByTournament: { partner: string; matches: ExternalMatch[] }[]
): { ranked: PartnerStats[]; few: PartnerStats[] } {
  const map = new Map<string, Tally>();
  for (const { partner, matches } of matchesByTournament) {
    const key = partner.trim() || "Sem parceiro informado";
    let tally = map.get(key) ?? emptyTally();
    for (const m of matches) tally = addToTally(tally, m);
    map.set(key, tally);
  }

  const all: PartnerStats[] = [...map.entries()].map(([partner, t]) => ({
    partner,
    ...t,
  }));

  const sorter = (a: PartnerStats, b: PartnerStats) =>
    winRate(b) - winRate(a) ||
    balance(b) - balance(a) ||
    b.wins - a.wins ||
    a.partner.localeCompare(b.partner, "pt-BR");

  return {
    ranked: all.filter((p) => p.played >= MIN_MATCHES_RANKING).sort(sorter),
    few: all
      .filter((p) => p.played < MIN_MATCHES_RANKING)
      .sort((a, b) => b.played - a.played),
  };
}
