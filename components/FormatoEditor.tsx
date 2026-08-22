"use client";

import { useState, useTransition } from "react";
import { setTournamentFormat } from "@/app/actions/tournaments";

const OPCOES: { valor: string; rotulo: string }[] = [
  { valor: "round_robin", rotulo: "Todos contra todos (sorteio automático)" },
  { valor: "simples", rotulo: "Simples (individual, um contra um)" },
  { valor: "treino", rotulo: "Jogo/Treino (várias quadras, sem sorteio)" },
  { valor: "rei_praia", rotulo: "Rei/Rainha da Praia (individual, rodízio)" },
  { valor: "knockout", rotulo: "Eliminatória direta (mata-mata)" },
  { valor: "groups_ko", rotulo: "Grupos + mata-mata" },
  { valor: "manual", rotulo: "Manual (eu monto as duplas e os jogos)" },
];

// Trocar o formato de um torneio já criado. A lista de presença não é tocada.
export default function FormatoEditor({
  groupId,
  tournamentId,
  format,
  temJogos,
}: {
  groupId: string;
  tournamentId: string;
  format: string;
  temJogos: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs font-bold text-court-600"
      >
        Alterar formato
      </button>
    );
  }

  return (
    <div className="card space-y-2">
      <p className="text-sm font-semibold text-slate-700">Formato do torneio</p>

      <select
        defaultValue={format}
        disabled={pending}
        onChange={(e) => {
          const novo = e.target.value;
          if (novo === format) return;
          if (
            temJogos &&
            !confirm(
              "Este torneio já tem jogos lançados. Trocar o formato muda como eles aparecem, mas nada é apagado. Continuar?"
            )
          ) {
            return;
          }
          setError(null);
          start(async () => {
            const res = await setTournamentFormat(groupId, tournamentId, novo);
            if (res?.error) setError(res.error);
            else setAberto(false);
          });
        }}
        className="input"
      >
        {OPCOES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>

      <p className="text-xs text-slate-400">
        As confirmações de presença, as duplas e o churrasco continuam como
        estão — trocar o formato só muda como o torneio é montado daqui para a
        frente.
      </p>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button
        onClick={() => setAberto(false)}
        className="btn-ghost w-full !py-2 text-sm"
      >
        Fechar
      </button>
    </div>
  );
}
