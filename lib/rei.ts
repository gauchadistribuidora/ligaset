// Rei da Praia — rodízio individual.
// Cada atleta joga com/contra vários parceiros.
//
// A regra de ouro é: todo mundo joga o mesmo número de jogos. Isso depende de
// quantos atletas há, porque cada jogo ocupa exatamente 4 vagas:
//
//   vagas por rodada = 4 x (nº de jogos simultâneos) = 4 x floor(n/4)
//
// Com 6 atletas, por exemplo, cabem 4 por rodada — os outros 2 descansam. Em 5
// rodadas seriam 20 vagas para 6 pessoas, o que não divide. Por isso o número
// de rodadas é esticado até a conta fechar (com 6 atletas, 6 rodadas = 24
// vagas = 4 jogos para cada um).

export interface ReiMatch {
  round: number;
  teamA: [string, string];
  teamB: [string, string];
}

const GHOST = "__descansa__";

export function reiRotationRounds(playerIds: string[]): ReiMatch[] {
  const n = playerIds.length;
  if (n < 4) return [];

  // Quando n dividido por 4 deixa resto 2 ou 3, sobra uma dupla sem adversário
  // a cada rodada, e o método do círculo acaba dando mais jogos a uns do que a
  // outros. Nesses casos usa o rodízio equilibrado.
  const matches = n % 4 >= 2 ? balancedRounds(playerIds) : circleRounds(playerIds);

  return orderRoundsForCold(matches, playerIds);
}

// ---------- regra do atleta frio ----------
// Quem acabou de descansar volta frio, e quem joga de dupla com ele leva
// desvantagem. Esse peso tem que rodar: ninguém pode pegar o frio duas vezes
// enquanto outro nunca pegou.
//
// As parcerias de cada rodada NÃO são mexidas aqui — só a ordem das rodadas.
// Assim o rodízio de parceiros continua exatamente como foi montado.
function orderRoundsForCold(
  matches: ReiMatch[],
  playerIds: string[]
): ReiMatch[] {
  const byRound = new Map<number, ReiMatch[]>();
  for (const m of matches) {
    const list = byRound.get(m.round) ?? [];
    list.push(m);
    byRound.set(m.round, list);
  }
  const remaining = [...byRound.values()];
  if (remaining.length <= 2) return matches;

  const playersOf = (round: ReiMatch[]) =>
    new Set(round.flatMap((m) => [...m.teamA, ...m.teamB]));

  const partnerOf = (round: ReiMatch[], p: string): string | null => {
    for (const m of round) {
      for (const team of [m.teamA, m.teamB]) {
        if (team[0] === p) return team[1];
        if (team[1] === p) return team[0];
      }
    }
    return null;
  };

  // Quantas vezes cada atleta pegaria um parceiro frio nesta ordem de rodadas.
  const carriedFor = (ordem: ReiMatch[][]): Record<string, number> => {
    const carried: Record<string, number> = {};
    for (const p of playerIds) carried[p] = 0;
    for (let i = 1; i < ordem.length; i++) {
      const antes = playersOf(ordem[i - 1]);
      for (const frio of playerIds) {
        if (antes.has(frio)) continue;
        const partner = partnerOf(ordem[i], frio);
        if (partner) carried[partner]++;
      }
    }
    return carried;
  };

  // Quanto mais parelho o "pegou frio" entre todos, melhor.
  const scoreOf = (ordem: ReiMatch[][]): number => {
    const c = Object.values(carriedFor(ordem));
    const max = Math.max(...c);
    const min = Math.min(...c);
    return (max - min) * 1000 + c.reduce((s, x) => s + x * x, 0);
  };

  // Monta uma ordem gulosa a partir de uma rodada inicial qualquer.
  const greedyFrom = (startIdx: number): ReiMatch[][] => {
    const pool = [...remaining];
    const ordem: ReiMatch[][] = [pool.splice(startIdx, 1)[0]];
    const carried: Record<string, number> = {};
    for (const p of playerIds) carried[p] = 0;

    while (pool.length) {
      const playedLast = playersOf(ordem[ordem.length - 1]);
      const frios = playerIds.filter((p) => !playedLast.has(p));

      let bestIdx = 0;
      let bestScore = Infinity;
      for (let i = 0; i < pool.length; i++) {
        let score = 0;
        for (const frio of frios) {
          const partner = partnerOf(pool[i], frio);
          // Quem já pegou frio antes pesa mais; e deixar o frio de fora outra
          // vez (dois descansos seguidos) também é ruim.
          score += partner ? carried[partner] * 10 : 4;
        }
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      const chosen = pool.splice(bestIdx, 1)[0];
      for (const frio of frios) {
        const partner = partnerOf(chosen, frio);
        if (partner) carried[partner]++;
      }
      ordem.push(chosen);
    }
    return ordem;
  };

  // O guloso depende de por onde começa, então testa todos os começos.
  let melhor = greedyFrom(0);
  let melhorScore = scoreOf(melhor);
  for (let s = 1; s < remaining.length; s++) {
    const cand = greedyFrom(s);
    const sc = scoreOf(cand);
    if (sc < melhorScore) {
      melhorScore = sc;
      melhor = cand;
    }
  }

  // Refina trocando rodadas de lugar enquanto melhorar.
  for (let pass = 0; pass < 20; pass++) {
    let melhorou = false;
    for (let i = 0; i < melhor.length; i++) {
      for (let j = i + 1; j < melhor.length; j++) {
        const cand = [...melhor];
        [cand[i], cand[j]] = [cand[j], cand[i]];
        const sc = scoreOf(cand);
        if (sc < melhorScore) {
          melhorScore = sc;
          melhor = cand;
          melhorou = true;
        }
      }
    }
    if (!melhorou) break;
  }

  return melhor.flatMap((round, i) =>
    round.map((m) => ({ ...m, round: i + 1 }))
  );
}

// ---------- método do círculo ----------
// Usado quando todas as duplas da rodada têm adversário (n múltiplo de 4, ou
// ímpar que vira múltiplo de 4 ao entrar o "descansa"). Aqui cada atleta joga
// com cada um dos outros exatamente uma vez — é o rodízio mais bonito que existe.
function circleRounds(playerIds: string[]): ReiMatch[] {
  const arr = [...playerIds];
  if (arr.length % 2 === 1) arr.push(GHOST);
  const n = arr.length;
  const roundsCount = n - 1;
  const half = n / 2;

  const list = [...arr];
  const out: ReiMatch[] = [];

  for (let r = 0; r < roundsCount; r++) {
    const teams: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === GHOST || b === GHOST) continue; // esse atleta descansa
      teams.push([a, b]);
    }
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

// ---------- rodízio equilibrado ----------
// A cada rodada entram os que jogaram menos até ali; empate resolve por quem
// está parado há mais tempo. Como o total de vagas é múltiplo do número de
// atletas, no fim todos terminam com exatamente o mesmo número de jogos.
function balancedRounds(playerIds: string[]): ReiMatch[] {
  const n = playerIds.length;
  const perRound = Math.floor(n / 4) * 4; // quantos jogam por rodada
  if (perRound < 4) return [];

  // Estica as rodadas até o total de vagas dividir certinho entre todos.
  let rounds = Math.max(n - 1, 1);
  while ((rounds * perRound) % n !== 0) rounds++;

  const games: Record<string, number> = {};
  const lastPlayed: Record<string, number> = {};
  for (const p of playerIds) {
    games[p] = 0;
    lastPlayed[p] = -1;
  }

  const partnered = new Map<string, number>(); // quantas vezes jogaram juntos
  const faced = new Map<string, number>(); // quantas vezes se enfrentaram
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const bump = (m: Map<string, number>, a: string, b: string) =>
    m.set(key(a, b), (m.get(key(a, b)) ?? 0) + 1);
  const count = (m: Map<string, number>, a: string, b: string) =>
    m.get(key(a, b)) ?? 0;

  const out: ReiMatch[] = [];

  const order = new Map(playerIds.map((p, i) => [p, i]));

  for (let r = 0; r < rounds; r++) {
    // Quem entra: menos jogos primeiro; depois quem está parado há mais tempo.
    // O último desempate gira a cada rodada, senão os mesmos nomes cairiam
    // sempre juntos.
    const playing = [...playerIds]
      .sort(
        (a, b) =>
          games[a] - games[b] ||
          lastPlayed[a] - lastPlayed[b] ||
          ((order.get(a)! + r) % n) - ((order.get(b)! + r) % n)
      )
      .slice(0, perRound);

    // Forma as duplas juntando quem menos jogou junto...
    const pool = [...playing];
    const teams: [string, string][] = [];
    while (pool.length >= 2) {
      let bi = 0;
      let bj = 1;
      let best = Infinity;
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const c = count(partnered, pool[i], pool[j]);
          if (c < best) {
            best = c;
            bi = i;
            bj = j;
          }
        }
      }
      const a = pool[bi];
      const b = pool[bj];
      pool.splice(bj, 1);
      pool.splice(bi, 1);
      teams.push([a, b]);
    }

    // ...e depois refina: a última dupla a se formar costuma ser a sobra, que
    // pode ser uma parceria repetida. Testa trocar integrantes entre duas
    // duplas e fica com a troca sempre que ela reduzir a repetição.
    for (let pass = 0; pass < teams.length; pass++) {
      let melhorou = false;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const [a, b] = teams[i];
          const [c, d] = teams[j];
          const atual = count(partnered, a, b) + count(partnered, c, d);
          const troca1 = count(partnered, a, c) + count(partnered, b, d);
          const troca2 = count(partnered, a, d) + count(partnered, b, c);
          if (troca1 < atual && troca1 <= troca2) {
            teams[i] = [a, c];
            teams[j] = [b, d];
            melhorou = true;
          } else if (troca2 < atual) {
            teams[i] = [a, d];
            teams[j] = [b, c];
            melhorou = true;
          }
        }
      }
      if (!melhorou) break;
    }

    // Cada dupla enfrenta a que menos encontrou até agora.
    while (teams.length >= 2) {
      const t1 = teams.shift() as [string, string];
      let bestIdx = 0;
      let bestCount = Infinity;
      for (let i = 0; i < teams.length; i++) {
        const t2 = teams[i];
        let c = 0;
        for (const x of t1) for (const y of t2) c += count(faced, x, y);
        if (c < bestCount) {
          bestCount = c;
          bestIdx = i;
        }
      }
      const t2 = teams.splice(bestIdx, 1)[0];

      bump(partnered, t1[0], t1[1]);
      bump(partnered, t2[0], t2[1]);
      for (const x of t1) for (const y of t2) bump(faced, x, y);
      for (const p of [...t1, ...t2]) {
        games[p]++;
        lastPlayed[p] = r;
      }
      out.push({ round: r + 1, teamA: t1, teamB: t2 });
    }
  }

  return out;
}
