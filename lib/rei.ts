// Rei da Praia — rodízio individual.
// Cada atleta joga com/contra vários parceiros (método do círculo).
// Nº ímpar de atletas: a cada rodada um descansa.

export interface ReiMatch {
  round: number;
  teamA: [string, string];
  teamB: [string, string];
}

const GHOST = "__descansa__";

export function reiRotationRounds(playerIds: string[]): ReiMatch[] {
  const base = [...playerIds];
  if (base.length < 4) return [];

  const arr = [...base];
  if (arr.length % 2 === 1) arr.push(GHOST); // ímpar -> um descansa por rodada
  const n = arr.length;
  const roundsCount = n - 1;
  const half = n / 2;

  const list = [...arr];
  const out: ReiMatch[] = [];
  const rests: Record<string, number> = {}; // quantas vezes cada atleta descansou

  for (let r = 0; r < roundsCount; r++) {
    // duplas (parcerias) da rodada pelo método do círculo
    const teams: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === GHOST || b === GHOST) continue; // esse atleta descansa
      teams.push([a, b]);
    }
    // se sobra uma dupla (nº ímpar de duplas), descansa a que menos descansou
    if (teams.length % 2 === 1) {
      let bestIdx = 0;
      let bestScore = Infinity;
      for (let i = 0; i < teams.length; i++) {
        const [p, q] = teams[i];
        const score = (rests[p] || 0) + (rests[q] || 0);
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      const [rp, rq] = teams[bestIdx];
      rests[rp] = (rests[rp] || 0) + 1;
      rests[rq] = (rests[rq] || 0) + 1;
      teams.splice(bestIdx, 1);
    }
    // duas duplas por jogo
    for (let i = 0; i + 1 < teams.length; i += 2) {
      out.push({ round: r + 1, teamA: teams[i], teamB: teams[i + 1] });
    }
    // rotaciona mantendo o primeiro fixo
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop() as string);
    list.splice(0, list.length, fixed, ...rest);
  }

  return out;
}
