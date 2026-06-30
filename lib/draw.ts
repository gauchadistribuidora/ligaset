// Utilidades puras de sorteio de duplas e geração de jogos (round-robin).

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Forma duplas a partir de uma lista de ids de jogadores.
// Retorna pares [p1, p2|null]. Sobra (ímpar) vira dupla incompleta.
export function makePairs(playerIds: string[]): [string, string | null][] {
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < playerIds.length; i += 2) {
    pairs.push([playerIds[i], playerIds[i + 1] ?? null]);
  }
  return pairs;
}

export interface DrawMatch {
  team_a: number; // índice do time
  team_b: number;
  play_order: number;
}

// Round-robin (todos contra todos) pelo método do círculo.
export function roundRobin(teamCount: number): DrawMatch[] {
  const matches: DrawMatch[] = [];
  if (teamCount < 2) return matches;

  const teams = Array.from({ length: teamCount }, (_, i) => i);
  if (teams.length % 2 === 1) teams.push(-1); // BYE

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  let order = 0;

  const list = [...teams];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== -1 && b !== -1) {
        matches.push({ team_a: a, team_b: b, play_order: order++ });
      }
    }
    // rotaciona (mantém o primeiro fixo)
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop()!);
    list.splice(0, list.length, fixed, ...rest);
  }
  return matches;
}
