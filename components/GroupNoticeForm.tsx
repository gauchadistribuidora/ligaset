"use client";

import { useState } from "react";

// Modelos prontos de aviso. O texto é montado aqui e vai para o WhatsApp do
// grupo — o Ligaset não manda e-mail para os jogadores.
const TEMPLATES = [
  {
    key: "mensalidade",
    chip: "💰 Mensalidade",
    message:
      "Oi, pessoal!\n\nPassando para lembrar que a mensalidade deste mês está em aberto. Assim que puderem, façam o acerto — é o que mantém a quadra reservada e o grupo rodando.\n\nQualquer dúvida sobre valor ou forma de pagamento, é só me chamar.\n\nBom jogo a todos! 🎾",
  },
  {
    key: "play",
    chip: "🎾 Dia de play",
    message:
      "Fala, galera!\n\nNão esqueçam: amanhã tem jogo. Cheguem com uns minutinhos de antecedência para a gente começar no horário.\n\nLevem água, protetor solar e boa energia. Nos vemos na areia! 🎾",
  },
  {
    key: "livre",
    chip: "✏️ Escrever do zero",
    message: "",
  },
];

export default function GroupNoticeForm({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState(TEMPLATES[0].key);
  const [message, setMessage] = useState(TEMPLATES[0].message);
  const [copied, setCopied] = useState(false);

  function pick(key: string) {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setTemplate(key);
    setMessage(t.message);
    setCopied(false);
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

      <textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setCopied(false);
        }}
        rows={8}
        placeholder="Escreva o aviso..."
        className="input resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!message.trim()}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              /* alguns navegadores bloqueiam; o texto fica à mão para copiar */
            }
          }}
          className="btn-ghost"
        >
          {copied ? "Copiado! ✓" : "Copiar texto"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn-primary ${
            message.trim() ? "" : "pointer-events-none opacity-50"
          }`}
        >
          Enviar no WhatsApp
        </a>
      </div>

      <p className="text-xs text-slate-400">
        O aviso vai pelo WhatsApp do grupo, onde o pessoal realmente lê. O
        Ligaset só usa e-mail para cadastro e recuperação de senha.
      </p>
    </div>
  );
}
