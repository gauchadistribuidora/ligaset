"use client";

import { useState, useTransition } from "react";
import {
  ratearChurrasco,
  setAttendance,
  setChurrasco,
  setTournamentCapacity,
  toggleChurrasco,
  toggleConfirmations,
} from "@/app/actions/attendance";
import { createGuestInvite } from "@/app/actions/guests";
import { brl } from "@/lib/format";

type Member = { id: string; name: string | null; isGuest?: boolean | null };

export default function AttendanceList({
  groupId,
  tournamentId,
  members,
  answers,
  order,
  myMemberId,
  isAdmin,
  open,
  confirmCode,
  capacity,
  guestCode,
  partners,
  churrascoOf,
  hasChurrasco,
  jogo,
}: {
  groupId: string;
  tournamentId: string;
  members: Member[];
  answers: Record<string, "yes" | "no">;
  // Ordem de chegada da confirmação — define quem fica na lista de espera.
  order: Record<string, string>;
  myMemberId: string | null;
  isAdmin: boolean;
  open: boolean;
  confirmCode: string | null;
  capacity: number | null;
  guestCode: string | null;
  // memberId -> id da dupla declarada por ele
  partners: Record<string, string>;
  // memberId -> marcou churrasco
  churrascoOf: Record<string, boolean>;
  hasChurrasco: boolean;
  jogo: { nome: string; data: string | null; local: string | null };
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<
    "lista" | "convite" | "resumo" | null
  >(null);
  const [codigoConvite, setCodigoConvite] = useState(guestCode);
  const [vagas, setVagas] = useState(capacity);
  const [editandoVagas, setEditandoVagas] = useState(false);
  const [abrirRateio, setAbrirRateio] = useState(false);
  const [rateioOk, setRateioOk] = useState<{
    porPessoa: number;
    cobrados: number;
    pix: string;
  } | null>(null);

  if (!open) {
    if (!isAdmin) return null;
    return (
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          ✋ Lista de confirmação
        </p>
        <p className="text-sm text-slate-500">
          Abra a lista para o pessoal marcar no app se vai ou não jogar. Você vê
          o total confirmado antes de fechar a quadra.
        </p>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await toggleConfirmations(groupId, tournamentId, true);
              if (res?.error) setError(res.error);
            })
          }
          className="btn-primary w-full"
        >
          {pending ? "Abrindo..." : "Abrir confirmação de presença"}
        </button>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    );
  }

  const alfabetica = (a: Member, b: Member) =>
    (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");

  // Quem confirmou sobe para o topo; dentro de cada bloco, ordem alfabética.
  const emOrdem = [...members].sort((a, b) => {
    const peso = (m: Member) =>
      answers[m.id] === "yes" ? 0 : answers[m.id] === "no" ? 2 : 1;
    return peso(a) - peso(b) || alfabetica(a, b);
  });

  // A vaga é de quem confirmou primeiro, então a fila usa a hora da resposta —
  // mesmo que a lista na tela apareça em ordem alfabética.
  const vao = members
    .filter((m) => answers[m.id] === "yes")
    .sort((a, b) => (order[a.id] ?? "").localeCompare(order[b.id] ?? ""));
  const naoVao = emOrdem.filter((m) => answers[m.id] === "no");
  const semResposta = emOrdem.filter((m) => !answers[m.id]);

  // Mesma ordem da lista pública: quem já resolveu a dupla aparece primeiro.
  const secoes = [
    {
      titulo: "Confirmados com dupla",
      gente: members
        .filter((m) => answers[m.id] === "yes" && partners[m.id])
        .sort(alfabetica),
      forte: true,
    },
    {
      titulo: "Confirmados sem dupla",
      gente: members
        .filter((m) => answers[m.id] === "yes" && !partners[m.id])
        .sort(alfabetica),
      forte: true,
    },
    { titulo: "Falta confirmar", gente: semResposta, forte: false },
    { titulo: "Estão fora", gente: naoVao, forte: false },
  ];

  const naChurrasqueira = Object.values(churrascoOf).filter(Boolean).length;

  // Quem confirmou depois da quadra lotar entra como espera e sobe sozinho se
  // alguém desistir — a ordem é a da confirmação.
  const esperaIds = new Set(vagas ? vao.slice(vagas).map((m) => m.id) : []);
  const dentro = vagas ? vao.slice(0, vagas) : vao;

  // Cada dupla aparece nos dois atletas, então conta metade.
  const duplasFormadas = Math.floor(Object.keys(partners).length / 2);

  const nomeDe = (id: string) => members.find((x) => x.id === id)?.name ?? "";

  // Resumo pronto para colar no grupo — cada dupla aparece uma vez só.
  function montarResumo(link: string | null) {
    const vistas = new Set<string>();
    const paresTexto: string[] = [];
    for (const m of vao) {
      const p = partners[m.id];
      if (!p || vistas.has(m.id)) continue;
      vistas.add(m.id);
      vistas.add(p);
      paresTexto.push(`• ${m.name ?? ""} e ${nomeDe(p)}`);
    }

    const semDupla = vao.filter((m) => !partners[m.id]).map((m) => m.name ?? "");

    const linhas = [
      `🎾 ${jogo.nome}${jogo.data ? ` — ${jogo.data}` : ""}`,
      jogo.local ? `📍 ${jogo.local}` : null,
      "",
      vagas
        ? `✅ ${dentro.length} de ${vagas} vagas · restam ${Math.max(
            0,
            vagas - dentro.length
          )}`
        : `✅ ${vao.length} confirmados`,
      esperaIds.size ? `⏳ ${esperaIds.size} na lista de espera` : null,
      hasChurrasco ? `🍖 ${naChurrasqueira} no churrasco` : null,
      "",
      paresTexto.length ? `Duplas (${paresTexto.length}):` : null,
      ...paresTexto,
      semDupla.length ? "" : null,
      semDupla.length
        ? `Ainda sem dupla (${semDupla.length}): ${semDupla.join(", ")}`
        : null,
      semResposta.length ? "" : null,
      semResposta.length
        ? `Falta confirmar (${semResposta.length}): ${semResposta
            .map((m) => m.name ?? "")
            .join(", ")}`
        : null,
      link ? "" : null,
      link ? `Confirme aqui: ${link}` : null,
    ];

    return linhas.filter((l) => l !== null).join("\n");
  }

  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const publicLink = confirmCode ? `${origem}/jogo/${confirmCode}` : null;
  const conviteLink = codigoConvite ? `${origem}/convite/${codigoConvite}` : null;
  // Página aberta, só leitura: quem recebe vê tudo sem poder mexer.
  const resumoLink = confirmCode ? `${origem}/resumo/${confirmCode}` : null;

  const marcarChurrasco = (memberId: string, sim: boolean) => {
    setError(null);
    start(async () => {
      const res = await setChurrasco(groupId, tournamentId, memberId, sim);
      if (res?.error) setError(res.error);
    });
  };

  const responder = (memberId: string, status: "yes" | "no" | null) => {
    setError(null);
    start(async () => {
      const res = await setAttendance(groupId, tournamentId, memberId, status);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            ✋ Confirmação de presença
          </p>
          <p className="text-xs text-slate-500">
            {vagas
              ? `${dentro.length} de ${vagas} vagas · restam ${Math.max(
                  0,
                  vagas - dentro.length
                )} · ${esperaIds.size} na espera`
              : `${vao.length} confirmado(s)`}{" "}
            · {naoVao.length} fora · {semResposta.length} sem responder
            {duplasFormadas > 0 ? ` · ${duplasFormadas} dupla(s)` : ""}
            {hasChurrasco ? ` · 🍖 ${naChurrasqueira} no churrasco` : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await toggleConfirmations(
                  groupId,
                  tournamentId,
                  false
                );
                if (res?.error) setError(res.error);
              })
            }
            className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Fechar lista
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl bg-slate-50 p-3">
          {editandoVagas ? (
            <form
              action={(fd) => {
                const bruto = String(fd.get("vagas") || "").trim();
                const n = bruto === "" ? null : Number(bruto);
                setError(null);
                start(async () => {
                  const res = await setTournamentCapacity(
                    groupId,
                    tournamentId,
                    n
                  );
                  if (res?.error) setError(res.error);
                  else {
                    setVagas(n === null || Number.isNaN(n) ? null : Math.max(0, Math.trunc(n)));
                    setEditandoVagas(false);
                  }
                });
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1">
                <label className="label">Vagas deste jogo</label>
                <input
                  name="vagas"
                  type="number"
                  min={0}
                  defaultValue={vagas ?? ""}
                  placeholder="Sem limite"
                  className="input"
                  autoFocus
                />
              </div>
              <button disabled={pending} className="btn-primary !py-2 text-sm">
                {pending ? "..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setEditandoVagas(false)}
                className="btn-ghost !py-2 text-sm"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                <strong className="font-semibold text-slate-800">
                  {vagas ? `${vagas} vagas` : "Sem limite de vagas"}
                </strong>
                {vagas ? ` · restam ${Math.max(0, vagas - dentro.length)}` : ""}
              </p>
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={() => setEditandoVagas(true)}
                  className="text-xs font-bold text-court-600"
                >
                  Alterar
                </button>
                {vagas !== dentro.length && (
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("Fechar as vagas no número de confirmados?"))
                        return;
                      setError(null);
                      start(async () => {
                        const res = await setTournamentCapacity(
                          groupId,
                          tournamentId,
                          dentro.length
                        );
                        if (res?.error) setError(res.error);
                        else setVagas(dentro.length);
                      });
                    }}
                    className="text-xs font-bold text-slate-500"
                  >
                    Fechar vagas
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">
              🍖 Este jogo tem churrasco
            </p>
            <p className="text-xs text-slate-500">
              {hasChurrasco
                ? "Cada um marca se fica para comer, jogando ou não."
                : "Ligue para abrir a marcação na lista de presença."}
            </p>
          </div>
          <button
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const res = await toggleChurrasco(
                  groupId,
                  tournamentId,
                  !hasChurrasco
                );
                if (res?.error) setError(res.error);
              });
            }}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
              hasChurrasco
                ? "bg-amber-500 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {hasChurrasco ? "Ligado" : "Desligado"}
          </button>
        </div>
      )}

      {isAdmin && hasChurrasco && naChurrasqueira > 0 && (
        <div className="rounded-xl bg-amber-50 p-3">
          {abrirRateio ? (
            <form
              action={(fd) => {
                const total = Number(
                  String(fd.get("total") || "").replace(",", ".")
                );
                const pix = String(fd.get("pix") || "");
                const comprador = String(fd.get("comprador") || "");
                setError(null);
                setRateioOk(null);
                start(async () => {
                  const res = await ratearChurrasco(
                    groupId,
                    tournamentId,
                    total,
                    pix,
                    comprador
                  );
                  if (res?.error) setError(res.error);
                  else {
                    setRateioOk({
                      porPessoa: res?.porPessoa ?? 0,
                      cobrados: res?.cobrados ?? 0,
                      pix,
                    });
                    setAbrirRateio(false);
                  }
                });
              }}
              className="space-y-2"
            >
              <p className="text-xs font-semibold text-slate-700">
                🍖 Ratear a carne entre os {naChurrasqueira}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Total gasto (R$)</label>
                  <input
                    name="total"
                    inputMode="decimal"
                    placeholder="350,00"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Quem comprou</label>
                  <select name="comprador" defaultValue="" className="input">
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {members
                      .filter((m) => churrascoOf[m.id])
                      .sort(alfabetica)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name ?? "Atleta"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Pix de quem comprou</label>
                <input
                  name="pix"
                  placeholder="CPF, telefone, e-mail ou chave aleatória"
                  className="input"
                />
              </div>
              <div className="flex gap-2">
                <button disabled={pending} className="btn-primary flex-1 !py-2 text-sm">
                  {pending ? "Rateando..." : "Criar as cobranças"}
                </button>
                <button
                  type="button"
                  onClick={() => setAbrirRateio(false)}
                  className="btn-ghost !py-2 text-sm"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Divide entre os {naChurrasqueira} que marcaram. Quem comprou não
                é cobrado — já pagou — e o Pix das cobranças é o dele.
              </p>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                🍖 Já comprou a carne? Divida o gasto entre os{" "}
                {naChurrasqueira} que vão comer.
              </p>
              <button
                onClick={() => setAbrirRateio(true)}
                className="shrink-0 text-xs font-bold text-court-600"
              >
                Ratear
              </button>
            </div>
          )}
          {rateioOk && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold text-court-600">
                {rateioOk.cobrados} cobrança(s) de {brl(rateioOk.porPessoa)}{" "}
                criadas, pendentes até você confirmar cada Pix.
              </p>
              {/* O Pix é de quem comprou a carne, então quem deve precisa
                  recebê-lo — e isso acontece no grupo, não numa tela. */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🍖 Churrasco do ${jogo.nome}

Deu ${brl(
                    rateioOk.porPessoa
                  )} por pessoa (${naChurrasqueira} no churrasco).

Pix: ${
                    rateioOk.pix
                  }`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost w-full !py-2 text-sm"
              >
                📋 Mandar o valor e o Pix no grupo
              </a>
            </div>
          )}
        </div>
      )}

      {isAdmin && semResposta.length > 0 && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `Pessoal, faltou confirmar presença: ${semResposta
              .map((m) => m.name ?? "")
              .filter(Boolean)
              .join(", ")}. Confirmem no app, por favor! 🎾`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost w-full !py-2 text-sm"
        >
          📣 Cobrar os {semResposta.length} que não responderam
        </a>
      )}

      {resumoLink && (
        <div className="rounded-xl bg-court-50 p-3">
          <p className="text-xs font-semibold text-slate-600">
            📋 Link do resumo do jogo
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">{resumoLink}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(resumoLink);
                  setCopied("resumo");
                  setTimeout(() => setCopied(null), 2500);
                } catch {
                  setError("Não consegui copiar. Copie o link na mão.");
                }
              }}
              className="text-xs font-bold text-court-600"
            >
              {copied === "resumo" ? "Copiado! ✓" : "Copiar link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(resumoLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-court-600"
            >
              WhatsApp
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                montarResumo(publicLink)
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-500"
            >
              Mandar em texto
            </a>
          </div>
        </div>
      )}

      {publicLink && (
        <div className="rounded-xl bg-ocean-900/5 p-3">
          <p className="text-xs font-semibold text-slate-600">
            🔗 Link para quem não tem o app
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">{publicLink}</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicLink);
                setCopied("lista");
                setTimeout(() => setCopied(null), 2500);
              } catch {
                setError("Não consegui copiar. Copie o link na mão.");
              }
            }}
            className="mt-2 text-xs font-bold text-court-600"
          >
            {copied === "lista" ? "Copiado! ✓" : "Copiar link"}
          </button>
        </div>
      )}

      {/* Convite para quem não é do grupo. É um link só, do jogo: quem recebe
          escolhe na tela quem o convidou. */}
      <div className="rounded-xl bg-amber-50 p-3">
        <p className="text-xs font-semibold text-slate-600">
          🙋 Link para convidar um amigo
        </p>
        {conviteLink ? (
          <>
            <p className="mt-1 break-all text-xs text-slate-500">
              {conviteLink}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(conviteLink);
                    setCopied("convite");
                    setTimeout(() => setCopied(null), 2500);
                  } catch {
                    setError("Não consegui copiar. Copie o link na mão.");
                  }
                }}
                className="text-xs font-bold text-court-600"
              >
                {copied === "convite" ? "Copiado! ✓" : "Copiar link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Bora jogar? Confirme sua presença aqui: ${conviteLink}`
                )}`}
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
              setError(null);
              start(async () => {
                const res = await createGuestInvite(groupId, tournamentId);
                if (res?.error) setError(res.error);
                else if (res?.code) setCodigoConvite(res.code);
              });
            }}
            className="mt-2 text-xs font-bold text-court-600"
          >
            {pending ? "Gerando..." : "Gerar link de convite"}
          </button>
        )}
      </div>

      {myMemberId && (
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Você vai jogar?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={pending}
              onClick={() => responder(myMemberId, "yes")}
              className={`btn !py-2 text-sm ${
                answers[myMemberId] === "yes"
                  ? "bg-court-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              ✅ Vou
            </button>
            <button
              disabled={pending}
              onClick={() => responder(myMemberId, "no")}
              className={`btn !py-2 text-sm ${
                answers[myMemberId] === "no"
                  ? "bg-rose-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              ❌ Não vou
            </button>
          </div>

          {hasChurrasco && (
            <button
              disabled={pending}
              onClick={() =>
                marcarChurrasco(myMemberId, !churrascoOf[myMemberId])
              }
              className={`btn mt-2 w-full !py-2 text-sm ${
                churrascoOf[myMemberId]
                  ? "bg-amber-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              🍖{" "}
              {churrascoOf[myMemberId]
                ? "Fico para o churrasco"
                : "Vou ficar para o churrasco?"}
            </button>
          )}
        </div>
      )}

      {secoes.map((sec) => {
        if (!sec.gente.length) return null;
        return (
          <section key={sec.titulo}>
            <p
              className={`mb-1 text-xs font-bold ${
                sec.forte ? "text-court-700" : "text-slate-400"
              }`}
            >
              {sec.titulo} ({sec.gente.length})
            </p>
            <div className="divide-y divide-slate-50">
        {sec.gente.map((m) => {
          const r = answers[m.id];
          return (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <span className="w-6 shrink-0 text-center">
                {r === "yes" ? "✅" : r === "no" ? "❌" : "⏳"}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${
                    r === "yes"
                      ? "font-semibold text-slate-800"
                      : "text-slate-500"
                  }`}
                >
                  {m.name ?? "Sem nome"}
                </p>
                {m.isGuest && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    convidado
                  </p>
                )}
                {partners[m.id] && (
                  <p className="truncate text-xs font-semibold text-court-600">
                    🤝 com{" "}
                    {members.find((x) => x.id === partners[m.id])?.name ??
                      "atleta"}
                  </p>
                )}
                {hasChurrasco && churrascoOf[m.id] && (
                  <p className="text-xs font-semibold text-amber-600">
                    🍖 fica para o churrasco
                  </p>
                )}
                {esperaIds.has(m.id) && (
                  <p className="text-xs font-semibold text-amber-600">
                    Lista de espera
                  </p>
                )}
              </div>
              {hasChurrasco && (isAdmin || m.id === myMemberId) && (
                <button
                  disabled={pending}
                  onClick={() => marcarChurrasco(m.id, !churrascoOf[m.id])}
                  title={
                    churrascoOf[m.id]
                      ? "Sai do churrasco"
                      : "Fica para o churrasco"
                  }
                  className={`shrink-0 rounded-lg px-2 py-1 text-sm ${
                    churrascoOf[m.id]
                      ? "bg-amber-100 ring-1 ring-amber-300"
                      : "opacity-40 ring-1 ring-slate-200"
                  }`}
                >
                  🍖
                </button>
              )}
              {isAdmin && (
                <div className="flex shrink-0 gap-1">
                  <button
                    disabled={pending}
                    onClick={() => responder(m.id, r === "yes" ? null : "yes")}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-court-600 hover:bg-court-50"
                  >
                    Vai
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => responder(m.id, r === "no" ? null : "no")}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    Não
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
          </section>
        );
      })}

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
