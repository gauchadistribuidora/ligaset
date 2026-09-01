"use client";

import { useState } from "react";

// O mesmo relatório, em texto, para colar no grupo. A observação vai junto —
// é ela que faz o pessoal responder.
export default function ResumoJogoWhatsApp({
  jogo,
  duplas,
  semDupla,
  churrasco,
  faltaConfirmar,
  ausentes,
}: {
  jogo: {
    nome: string;
    data: string | null;
    local: string | null;
    temChurrasco: boolean;
  };
  duplas: string[];
  semDupla: string[];
  churrasco: string[];
  faltaConfirmar: string[];
  ausentes: string[];
}) {
  const [copiado, setCopiado] = useState(false);

  const linhas: (string | null)[] = [
    `🎾 ${jogo.nome}${jogo.data ? ` — ${jogo.data}` : ""}`,
    jogo.local ? `📍 ${jogo.local}` : null,
    "",
    duplas.length ? `🤝 Duplas (${duplas.length}):` : null,
    ...duplas.map((d, i) => `${i + 1}. ${d}`),
    duplas.length ? "" : null,
    semDupla.length
      ? `✅ Confirmados sem dupla (${semDupla.length}): ${semDupla.join(", ")}`
      : null,
    jogo.temChurrasco
      ? `🍖 No churrasco (${churrasco.length})${
          churrasco.length ? `: ${churrasco.join(", ")}` : ""
        }`
      : null,
    faltaConfirmar.length
      ? `⏳ Falta confirmar (${faltaConfirmar.length}): ${faltaConfirmar.join(
          ", "
        )}`
      : null,
    ausentes.length
      ? `❌ Não vão jogar (${ausentes.length}): ${ausentes.join(", ")}`
      : null,
    "",
    "Favor confirmar presença no jogo e marcar o ícone da carne 🍖 se vai ficar para o churrasco.",
  ];

  const texto = linhas.filter((l) => l !== null).join("\n");

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            /* sem área de transferência: sobra o botão do WhatsApp */
          }
        }}
        className="btn-ghost !py-2 text-sm"
      >
        {copiado ? "Copiado! ✓" : "Copiar texto"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary !py-2 text-center text-sm"
      >
        Mandar no WhatsApp
      </a>
    </div>
  );
}
