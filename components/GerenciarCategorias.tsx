"use client";

import { useState, useTransition } from "react";
import { adicionarCategoria, excluirCategoria } from "@/app/actions/finance";
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA } from "@/lib/categorias";

type Categoria = { id: string; kind: "receita" | "despesa"; name: string };

// As categorias do app não somem; estas são as que o grupo acrescentou.
export default function GerenciarCategorias({
  groupId,
  categorias,
}: {
  groupId: string;
  categorias: Categoria[];
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const daReceita = categorias.filter((c) => c.kind === "receita");
  const daDespesa = categorias.filter((c) => c.kind === "despesa");

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="btn-ghost w-full !py-2 text-sm"
      >
        🏷️ Categorias do financeiro
        {categorias.length > 0 ? ` (${categorias.length} suas)` : ""}
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            🏷️ Categorias do financeiro
          </p>
          <p className="text-xs text-slate-500">
            As do app continuam disponíveis; aqui você acrescenta as suas.
          </p>
        </div>
        <button
          onClick={() => setAberto(false)}
          className="shrink-0 text-xs font-semibold text-slate-400"
        >
          Fechar
        </button>
      </div>

      <Grupo
        titulo="💰 Receita"
        groupId={groupId}
        kind="receita"
        padroes={CATEGORIAS_RECEITA}
        minhas={daReceita}
        pending={pending}
        start={start}
        setError={setError}
      />

      <Grupo
        titulo="💸 Despesa"
        groupId={groupId}
        kind="despesa"
        padroes={CATEGORIAS_DESPESA}
        minhas={daDespesa}
        pending={pending}
        start={start}
        setError={setError}
      />

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}

function Grupo({
  titulo,
  groupId,
  kind,
  padroes,
  minhas,
  pending,
  start,
  setError,
}: {
  titulo: string;
  groupId: string;
  kind: "receita" | "despesa";
  padroes: string[];
  minhas: Categoria[];
  pending: boolean;
  start: (fn: () => void) => void;
  setError: (s: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-600">{titulo}</p>

      <p className="text-xs leading-relaxed text-slate-400">
        {padroes.join(" · ")}
      </p>

      {minhas.length > 0 && (
        <div className="divide-y divide-slate-50">
          {minhas.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                {c.name}
              </span>
              <button
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      `Excluir "${c.name}"? Lançamentos antigos mantêm o nome.`
                    )
                  )
                    return;
                  setError(null);
                  start(async () => {
                    const res = await excluirCategoria(groupId, c.id);
                    if (res?.error) setError(res.error);
                  });
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        action={(fd) => {
          const nome = String(fd.get("nome") || "").trim();
          if (!nome) {
            setError("Escreva o nome da categoria.");
            return;
          }
          setError(null);
          start(async () => {
            const res = await adicionarCategoria(groupId, kind, nome);
            if (res?.error) setError(res.error);
          });
        }}
        className="flex gap-2"
      >
        <input
          name="nome"
          maxLength={40}
          placeholder={
            kind === "receita" ? "Ex: Camiseta, Bazar" : "Ex: Van, Arbitragem"
          }
          className="input flex-1"
        />
        <button
          disabled={pending}
          className="btn-ghost shrink-0 !px-3 !py-2 text-xs"
        >
          Adicionar
        </button>
      </form>
    </div>
  );
}
