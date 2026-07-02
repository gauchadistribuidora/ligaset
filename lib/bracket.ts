// Geração de chaveamento (single elimination) com cabeças-de-chave e byes.

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Ordem padrão de seeds por posição do bracket (tamanho = potência de 2).
// Ex: size 4 -> [1,4,2,3]; size 8 -> [1,8,4,5,2,7,3,6].
export function standardSeedOrder(size: number): number[] {
  let pls = [1, 2];
  while (pls.length < size) {
    const sum = pls.length * 2 + 1;
    const out: number[] = [];
    for (const p of pls) {
      out.push(p);
      out.push(sum - p);
    }
    pls = out;
  }
  return pls.slice(0, size);
}

export interface BracketGame {
  temp: string;
  round: number; // 1 = primeira rodada; maior = mais perto da final
  slot: number;
  aTeam: string | null;
  bTeam: string | null;
  nextTemp: string | null;
  nextSlot: number | null; // 0 -> entra como dupla A do próximo; 1 -> dupla B
}

// Recebe os ids das duplas já em ordem de seed (seed 1 primeiro).
// Retorna a lista de jogos reais (contestados) do mata-mata, com vínculos.
export function buildSingleElim(teamIdsSeeded: string[]): BracketGame[] {
  const N = teamIdsSeeded.length;
  if (N < 2) return [];
  const size = nextPow2(N);
  const R = Math.round(Math.log2(size));
  const order = standardSeedOrder(size);
  const teamAtSlot = (pos: number): string | null => {
    const seed = order[pos];
    return seed <= N ? teamIdsSeeded[seed - 1] : null;
  };

  let counter = 0;
  const games: BracketGame[] = [];
  const byTemp: Record<string, BracketGame> = {};

  function build(
    round: number,
    slot: number
  ): { byeTeam: string | null; feedTemp: string | null } {
    if (round === 1) {
      const a = teamAtSlot(2 * slot);
      const b = teamAtSlot(2 * slot + 1);
      if (a && b) {
        const temp = "g" + counter++;
        const g: BracketGame = {
          temp,
          round,
          slot,
          aTeam: a,
          bTeam: b,
          nextTemp: null,
          nextSlot: null,
        };
        games.push(g);
        byTemp[temp] = g;
        return { byeTeam: null, feedTemp: temp };
      }
      return { byeTeam: a || b || null, feedTemp: null };
    }

    const L = build(round - 1, 2 * slot);
    const Rr = build(round - 1, 2 * slot + 1);
    const aWill = !!L.byeTeam || !!L.feedTemp;
    const bWill = !!Rr.byeTeam || !!Rr.feedTemp;

    if (aWill && bWill) {
      const temp = "g" + counter++;
      const g: BracketGame = {
        temp,
        round,
        slot,
        aTeam: L.byeTeam,
        bTeam: Rr.byeTeam,
        nextTemp: null,
        nextSlot: null,
      };
      games.push(g);
      byTemp[temp] = g;
      if (L.feedTemp) {
        byTemp[L.feedTemp].nextTemp = temp;
        byTemp[L.feedTemp].nextSlot = 0;
      }
      if (Rr.feedTemp) {
        byTemp[Rr.feedTemp].nextTemp = temp;
        byTemp[Rr.feedTemp].nextSlot = 1;
      }
      return { byeTeam: null, feedTemp: temp };
    }

    // só um lado terá dupla: passa adiante (bye ou o feeder sobe direto)
    return {
      byeTeam: L.byeTeam || Rr.byeTeam || null,
      feedTemp: L.feedTemp || Rr.feedTemp || null,
    };
  }

  build(R, 0);
  games.sort((a, b) => a.round - b.round || a.slot - b.slot);
  return games;
}

// Rótulo da rodada a partir do nº de jogos nela (1 -> Final, 2 -> Semifinal...).
export function roundLabel(gamesInRound: number): string {
  switch (gamesInRound) {
    case 1:
      return "Final";
    case 2:
      return "Semifinal";
    case 4:
      return "Quartas de final";
    case 8:
      return "Oitavas de final";
    case 16:
      return "16-avos";
    default:
      return `Fase de ${gamesInRound * 2}`;
  }
}
