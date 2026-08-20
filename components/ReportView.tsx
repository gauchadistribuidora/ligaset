"use client";

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

  function printReport() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const esc = (v: any) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const secHtml = sections
      .map((sec) => {
        const head = sec.columns
          .map(
            (c) =>
              `<th style="text-align:${c.align || "left"}">${esc(c.label)}</th>`
          )
          .join("");
        const body = sec.rows
          .map(
            (r) =>
              "<tr>" +
              sec.columns
                .map(
                  (c) =>
                    `<td style="text-align:${c.align || "left"}">${esc(
                      r[c.key]
                    )}</td>`
                )
                .join("") +
              "</tr>"
          )
          .join("");
        return `${sec.title ? `<h2>${esc(sec.title)}</h2>` : ""}<table><thead><tr>${head}</tr></thead><tbody>${
          body || `<tr><td colspan="${sec.columns.length}">Sem dados.</td></tr>`
        }</tbody></table>`;
      })
      .join("");
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(
      title
    )}</title><style>
      *{font-family:Arial,Helvetica,sans-serif;}
      body{margin:24px;color:#0f172a;}
      h1{font-size:20px;margin:0 0 2px;}
      h2{font-size:15px;margin:18px 0 6px;}
      .meta{color:#64748b;font-size:12px;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:12px;}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;}
      th{background:#f1f5f9;}
      tr:nth-child(even) td{background:#f8fafc;}
      @media print{.noprint{display:none;}}
    </style></head><body>
      <h1>${esc(title)}</h1>
      <div class="meta">${groupName ? esc(groupName) + " • " : ""}${esc(
      subtitle || ""
    )}${subtitle ? " • " : ""}Gerado em ${esc(stamp)}</div>
      ${secHtml}
      <script>window.onload=function(){setTimeout(function(){window.print();},250);}</script>
    </body></html>`);
    w.document.close();
  }

  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={printReport} className="btn-dark !py-2 text-sm">
          🖨️ Imprimir / PDF
        </button>
        <button onClick={downloadExcel} className="btn-primary !py-2 text-sm">
          ⬇️ Baixar Excel
        </button>
      </div>

      <div className="space-y-6">
        {sections.map((sec, i) => (
          <div key={i}>
            {sec.title && (
              <h3 className="mb-2 font-bold text-slate-800">{sec.title}</h3>
            )}
            <div className="card overflow-x-auto !p-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-400">
                  <tr className="border-b border-slate-100">
                    {sec.columns.map((c) => (
                      <th
                        key={c.key}
                        className={`px-3 py-2 font-medium ${alignCls(c.align)}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map((r, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-slate-50 last:border-0"
                    >
                      {sec.columns.map((c) => (
                        <td
                          key={c.key}
                          className={`px-3 py-2 ${alignCls(c.align)} ${
                            c.key === sec.columns[0].key
                              ? "font-medium text-slate-800"
                              : "text-slate-600"
                          }`}
                        >
                          {r[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sec.rows.length === 0 && (
                <p className="p-4 text-sm text-slate-400">Sem dados.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
