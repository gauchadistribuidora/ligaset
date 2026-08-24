"use client";

import { useState, useTransition } from "react";
import { criarLinkCobranca } from "@/app/actions/cobranca";
import { brl } from "@/lib/format";

// O texto pode ter várias linhas; em resumo e título usamos só a primeira.
const primeiraLinha = (texto: string) => texto.split("\n")[0].trim();

// Gera um link de cobrança para mandar por WhatsApp. O valor é opcional: sem
// ele, quem paga digita quanto quer.
export default function CobrancaPorLink({ groupId }: { groupId: string }) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [feito, setFeito] = useState<{
    code: string;
    valor: number | null;
    descricao: string;
  } | null>(null);

  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const link = feito ? `${origem}/cobrar/${feito.code}` : null;

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="btn-ghost w-full !py-2 text-sm"
      >
        📲 Enviar cobrança por QR Code
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          📲 Cobrança por QR Code
        </p>
        <button
          onClick={() => {
            setAberto(false);
            setFeito(null);
            setError(null);
          }}
          className="shrink-0 text-xs font-semibold text-slate-400"
        >
          Fechar
        </button>
      </div>

      {link ? (
        <div className="space-y-2">
          <div className="rounded-xl bg-court-50 p-3">
            <p className="text-xs font-semibold text-slate-600">
              {feito?.valor
                ? `Cobrança de ${brl(feito.valor)}`
                : "Cobrança sem valor definido"}
              {feito?.descricao ? ` · ${primeiraLinha(feito.descricao)}` : ""}
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">{link}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2500);
                } catch {
                  setError("Não consegui copiar. Copie o link na mão.");
                }
              }}
              className="btn-ghost !py-2 text-sm"
            >
              {copiado ? "Copiado! ✓" : "Copiar link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `${feito?.descricao || "Pagamento"}${
                  feito?.valor ? ` — ${brl(feito.valor)}` : ""
                }\n\nPague por aqui: ${link}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !py-2 text-center text-sm"
            >
              WhatsApp
            </a>
          </div>

          <button
            onClick={() => setFeito(null)}
            className="w-full text-xs font-semibold text-court-600"
          >
            Gerar outra cobrança
          </button>
        </div>
      ) : (
        <form
          action={(fd) => {
            const bruto = String(fd.get("valor") || "").replace(",", ".").trim();
            const valor = bruto ? Number(bruto) : null;
            const descricao = String(fd.get("descricao") || "").trim();
            if (bruto && !(valor && valor > 0)) {
              setError("Valor inválido.");
              return;
            }
            setError(null);
            start(async () => {
              const res = await criarLinkCobranca(groupId, valor, descricao);
              if (res?.error) setError(res.error);
              else if (res?.code) {
                setFeito({ code: res.code, valor, descricao });
              }
            });
          }}
          className="space-y-2"
        >
          <div>
            <label className="label">Valor (opcional)</label>
            <input
              name="valor"
              inputMode="decimal"
              placeholder="50,00"
              className="input"
            />
            <p className="mt-1 text-xs text-slate-400">
              Sem valor, quem receber digita quanto vai pagar — útil quando há
              mais de um preço.
            </p>
          </div>

          <div>
            <label className="label">O que escrever para quem receber</label>
            <textarea
              name="descricao"
              rows={6}
              maxLength={600}
              placeholder={`Playzão 28/08 - Cartel

Valor para quem só vai jogar: R$ 50,00
Valor para Jogo + Cachorro quente: R$ 75,00`}
              className="input resize-y font-normal"
            />
            <p className="mt-1 text-xs text-slate-400">
              Pode usar várias linhas — o texto aparece na página de pagamento
              do jeito que você escrever.
            </p>
          </div>

          <button disabled={pending} className="btn-primary w-full !py-2 text-sm">
            {pending ? "Gerando..." : "Gerar link de cobrança"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
