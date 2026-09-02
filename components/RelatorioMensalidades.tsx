"use client";

import { useMemo, useState, useTransition } from "react";
import { linkDasMensalidades } from "@/app/actions/mensalidades";
import { brl, monthLabel } from "@/lib/format";

// Texto pronto para colar no grupo. Nao virou pagina publica de proposito:
// quem deve o que nao precisa ficar num endereco aberto na internet.
export default function RelatorioMensalidades({
  groupId,
  grupo,
  meses,
  porMes,
  pix,
}: {
  groupId: string;
  grupo: string;
  meses: string[];
  porMes: Record<string, any[]>;
  pix: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(meses[0] ?? "");
  const [copiado, setCopiado] = useState<"texto" | "link" | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  // O link e por mes: cada mes tem o seu.
  const [links, setLinks] = useState<Record<string, string>>({});
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const link = links[mes] ? `${origem}/mensalidades/${links[mes]}` : null;

  const nomeDe = (p: any) =>
    p.member?.name || p.member?.profile?.full_name || "Jogador";

  const texto = useMemo(() => {
    const linhas = (porMes[mes] ?? [])
      .slice()
      .sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), "pt-BR"));

    const pagos = linhas.filter((p) => p.status === "paid");
    const abertos = linhas.filter((p) => p.status !== "paid");
    const aReceber = abertos.reduce((s, p) => s + Number(p.amount), 0);
    const recebido = pagos.reduce((s, p) => s + Number(p.amount), 0);

    const partes: (string | null)[] = [
      `💰 *Mensalidades — ${monthLabel(mes)}*`,
      grupo,
      "",
      `✅ *Em dia (${pagos.length})* — ${brl(recebido)}`,
      pagos.length ? pagos.map((p) => nomeDe(p)).join(", ") : "Ninguém ainda.",
      "",
      `⏳ *Falta pagar (${abertos.length})* — ${brl(aReceber)}`,
      ...(abertos.length
        ? abertos.map((p) => `• ${nomeDe(p)} — ${brl(Number(p.amount))}`)
        : ["Todo mundo em dia! 🎉"]),
    ];

    if (abertos.length && pix) {
      partes.push("", `Pix: ${pix}`);
    }

    return partes.filter((l) => l !== null).join("\n");
  }, [mes, porMes, grupo, pix]);

  if (!meses.length) return null;

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="btn-ghost w-full !py-2 text-sm"
      >
        📋 Relatório de mensalidades para o grupo
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          📋 Relatório para o grupo
        </p>
        <button
          onClick={() => setAberto(false)}
          className="shrink-0 text-xs font-semibold text-slate-400"
        >
          Fechar
        </button>
      </div>

      <div>
        <label className="label">Mês</label>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="input capitalize"
        >
          {meses.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Ve antes de mandar: o texto vai para 40 pessoas. */}
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-600">
        {texto}
      </pre>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado("texto");
              setTimeout(() => setCopiado(null), 2500);
            } catch {
              /* sem area de transferencia: sobra o botao do WhatsApp */
            }
          }}
          className="btn-ghost !py-2 text-sm"
        >
          {copiado === "texto" ? "Copiado! ✓" : "Copiar texto"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !py-2 text-center text-sm"
        >
          Mandar no grupo
        </a>
      </div>

      <p className="text-xs text-slate-400">
        Os nomes com asterisco aparecem em negrito no WhatsApp.
      </p>

      {/* Alem do texto, a pagina onde quem deve paga na hora pelo QR. */}
      <div className="rounded-xl bg-court-50 p-3">
        <p className="text-xs font-semibold text-slate-600">
          🔗 Página do mês, com botão de pagar
        </p>
        {link ? (
          <>
            <p className="mt-1 break-all text-xs text-slate-500">{link}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopiado("link");
                    setTimeout(() => setCopiado(null), 2500);
                  } catch {
                    setErro("Não consegui copiar. Copie o link na mão.");
                  }
                }}
                className="text-xs font-bold text-court-600"
              >
                {copiado === "link" ? "Copiado! ✓" : "Copiar link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(link)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-court-600"
              >
                WhatsApp
              </a>
            </div>
          </>
        ) : (
          <button
            disabled={pending}
            onClick={() => {
              setErro(null);
              start(async () => {
                const res = await linkDasMensalidades(groupId, mes);
                if (res?.error) setErro(res.error);
                else if (res?.code)
                  setLinks((v) => ({ ...v, [mes]: res.code as string }));
              });
            }}
            className="mt-2 text-xs font-bold text-court-600"
          >
            {pending ? "Gerando..." : "Gerar link do mês"}
          </button>
        )}
        {erro && <p className="mt-1 text-xs text-rose-500">{erro}</p>}
      </div>
    </div>
  );
}
