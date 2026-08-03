"use client";

import { useState, useTransition } from "react";
import { sendGroupNotice } from "@/app/actions/notices";

// Modelos prontos: o administrador escolhe, ajusta o texto se quiser e envia.
// O texto fica sempre editável — modelo é ponto de partida, não camisa de força.
const TEMPLATES = [
  {
    key: "mensalidade",
    chip: "💰 Mensalidade",
    subject: "Lembrete: mensalidade do mês",
    message:
      "Oi, pessoal!\n\nPassando para lembrar que a mensalidade deste mês está em aberto. Assim que puderem, façam o acerto — é o que mantém a quadra reservada e o grupo rodando.\n\nQualquer dúvida sobre valor ou forma de pagamento, é só me chamar.\n\nBom jogo a todos! 🎾",
  },
  {
    key: "play",
    chip: "🎾 Dia de play",
    subject: "Amanhã é dia de play!",
    message:
      "Fala, galera!\n\nNão esqueçam: amanhã tem jogo. Cheguem com uns minutinhos de antecedência para a gente começar no horário.\n\nLevem água, protetor solar e boa energia. Nos vemos na areia! 🎾",
  },
  {
    key: "livre",
    chip: "✏️ Escrever do zero",
    subject: "",
    message: "",
  },
];

export default function GroupNoticeForm({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState(TEMPLATES[0].key);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [message, setMessage] = useState(TEMPLATES[0].message);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{
    ok?: boolean;
    error?: string;
    count?: number;
  } | null>(null);

  function pick(key: string) {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setTemplate(key);
    setSubject(t.subject);
    setMessage(t.message);
    setMsg(null);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        📣 Avisar o grupo
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Avisar o grupo</p>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pick(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              template === t.key
                ? "bg-ocean-900 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {t.chip}
          </button>
        ))}
      </div>

      <form
        action={(formData) => {
          setMsg(null);
          start(async () => {
            const res = await sendGroupNotice(groupId, formData);
            setMsg(res as any);
          });
        }}
        className="space-y-3"
      >
        <div>
          <label className="label">Assunto</label>
          <input
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="Ex: Mudança de horário no sábado"
            className="input"
          />
        </div>
        <div>
          <label className="label">Mensagem</label>
          <textarea
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={8}
            placeholder="Escreva o aviso..."
            className="input resize-none"
          />
        </div>
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Enviando..." : "Enviar para o grupo"}
        </button>
      </form>

      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && (
        <p className="text-sm text-court-600">
          Aviso enviado para {msg.count} membro(s)! ✓
        </p>
      )}
      <p className="text-xs text-slate-400">
        Vai por e-mail para os membros ativos com endereço cadastrado, em cópia
        oculta — ninguém vê o e-mail de ninguém.
      </p>
    </div>
  );
}
