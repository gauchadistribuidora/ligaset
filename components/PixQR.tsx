"use client";

import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { pixCopiaECola, type TipoChave } from "@/lib/pix";
import { brl } from "@/lib/format";

// QR do Pix montado no próprio aparelho: o padrão do Banco Central é aberto,
// então não há gateway, taxa nem serviço de terceiro no meio.
export default function PixQR({
  chave,
  tipo,
  nome,
  cidade,
  valor,
  descricao,
  titulo = "Pagar com Pix",
}: {
  chave: string;
  tipo?: TipoChave | null;
  nome: string;
  cidade?: string | null;
  valor?: number | null;
  descricao?: string | null;
  titulo?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [aberto, setAberto] = useState(false);

  const payload = useMemo(() => {
    try {
      return pixCopiaECola({ chave, tipo, nome, cidade, valor, descricao });
    } catch {
      return null;
    }
  }, [chave, tipo, nome, cidade, valor, descricao]);

  const svg = useMemo(() => {
    if (!payload) return null;
    // Correção de erro média: aguenta um pouco de sujeira na tela do outro
    // celular sem ficar grande demais.
    const qr = qrcode(0, "M");
    qr.addData(payload);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [payload]);

  if (!payload || !svg) {
    return (
      <p className="text-xs text-slate-400">
        Chave Pix inválida — confira no cadastro do grupo.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">{titulo}</p>
          {valor ? (
            <p className="text-lg font-black text-court-700">{brl(valor)}</p>
          ) : (
            <p className="text-xs text-slate-500">Você digita o valor no app</p>
          )}
        </div>
        <button
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 text-xs font-bold text-court-600"
        >
          {aberto ? "Esconder" : "Mostrar QR"}
        </button>
      </div>

      {aberto && (
        <div
          className="mx-auto mt-3 w-48 max-w-full [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(payload);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            setAberto(true);
          }
        }}
        className="btn-primary mt-3 w-full !py-2 text-sm"
      >
        {copiado ? "Copiado! ✓" : "Copiar código Pix"}
      </button>

      <p className="mt-2 text-center text-[11px] text-slate-400">
        Abra o app do banco, escolha Pix &gt; Pix Copia e Cola — ou leia o QR.
      </p>
    </div>
  );
}
