"use client";

import PdfButton from "./PdfButton";

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};
export type ReportSection = {
  title?: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
};

export default function ReportView({
  title,
  subtitle,
  sections,
  groupName,
}: {
  title: string;
  subtitle?: string;
  sections: ReportSection[];
  groupName?: string;
}) {
  const stamp = new Date().toLocaleString("pt-BR");

  function slug(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Excel de verdade (.xlsx), com uma aba por seção. A biblioteca é carregada
  // só no clique para não pesar a abertura da tela.
  async function downloadExcel() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const usados = new Set<string>();

    sections.forEach((sec, i) => {
      const aoa = [
        sec.columns.map((c) => c.label),
        ...sec.rows.map((r) => sec.columns.map((c) => r[c.key] ?? "")),
      ];
      let nome = (sec.title || title || `Planilha ${i + 1}`)
        // Caracteres que o Excel não aceita em nome de aba.
        .replace(/[\\/?*[\]:]/g, "")
        .slice(0, 28);
      if (!nome) nome = `Planilha ${i + 1}`;
      let final = nome;
      let n = 2;
      while (usados.has(final)) final = `${nome} ${n++}`;
      usados.add(final);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), final);
    });

    XLSX.writeFile(wb, `${slug(title)}.xlsx`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <PdfButton
          dados={{
            titulo: title,
            subtitulo: [groupName, subtitle].filter(Boolean).join(" • "),
            arquivo: slug(title),
            secoes: sections.map((sec) => ({
              titulo: sec.title,
              colunas: sec.columns.map((c) => c.label),
              linhas: sec.rows.map((r) =>
                sec.columns.map((c) => r[c.key] ?? "")
              ),
            })),
          }}
          rotulo="📄 Gerar PDF"
          className="btn-dark !py-2 text-sm"
        />
        <button onClick={downloadExcel} className="btn-primary !py-2 text-sm">
          ⬇️ Baixar Excel
        </button>
      </div>

      {/* Na tela, cada linha é um cartão: tabela de 5 colunas não cabe no
          celular e obrigava a rolar de lado. No PDF a tabela volta. */}
      <div className="space-y-6">
        {sections.map((sec, i) => {
          const [principal, ...demais] = sec.columns;
          return (
            <div key={i}>
              {sec.title && (
                <h3 className="mb-2 font-bold text-slate-800">{sec.title}</h3>
              )}

              {sec.rows.length === 0 ? (
                <div className="card text-sm text-slate-400">Sem dados.</div>
              ) : (
                <div className="space-y-2">
                  {sec.rows.map((r, ri) => (
                    <div key={ri} className="card !p-4">
                      <p className="font-bold text-slate-900">
                        {r[principal.key] || "—"}
                      </p>
                      {demais.length > 0 && (
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {demais.map((c) => (
                            <div
                              key={c.key}
                              className="flex items-baseline justify-between gap-2 border-b border-slate-50 pb-1"
                            >
                              <dt className="shrink-0 text-xs text-slate-400">
                                {c.label}
                              </dt>
                              <dd className="truncate text-sm font-semibold text-slate-700">
                                {r[c.key] === "" || r[c.key] === undefined
                                  ? "—"
                                  : r[c.key]}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-2 px-1 text-xs text-slate-400">
                {sec.rows.length} registro(s)
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
