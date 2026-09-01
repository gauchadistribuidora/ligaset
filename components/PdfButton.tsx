"use client";

import { useState } from "react";
import { gerarPdf, type DadosPdf } from "@/lib/pdf";

// Gera o arquivo direto, sem passar pela caixa de impressão do navegador.
export default function PdfButton({
  dados,
  rotulo = "📄 Gerar PDF",
  className = "btn-primary w-full",
}: {
  dados: DadosPdf;
  rotulo?: string;
  className?: string;
}) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={gerando}
        onClick={async () => {
          setErro(null);
          setGerando(true);
          try {
            await gerarPdf(dados);
          } catch {
            setErro("Não consegui gerar o PDF. Tente de novo.");
          } finally {
            setGerando(false);
          }
        }}
        className={className}
      >
        {gerando ? "Gerando PDF..." : rotulo}
      </button>
      {erro && <p className="mt-1 text-sm text-rose-500">{erro}</p>}
    </div>
  );
}
