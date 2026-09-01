// Geração de PDF no próprio aparelho. A biblioteca é carregada só quando a
// pessoa clica em gerar — não pesa em quem nunca abre relatório.

export type SecaoPdf = {
  titulo?: string;
  // Tabela: cabeçalho + linhas.
  colunas?: string[];
  linhas?: (string | number)[][];
  // Ou texto corrido, uma linha por item.
  texto?: string[];
};

export type DadosPdf = {
  titulo: string;
  subtitulo?: string | null;
  secoes: SecaoPdf[];
  arquivo: string;
};

function nomeArquivo(base: string) {
  const limpo = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${limpo || "relatorio"}.pdf`;
}

export async function gerarPdf(dados: DadosPdf) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as any).default ?? autoTableMod;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margem = 40;
  const largura = doc.internal.pageSize.getWidth();
  let y = margem;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(dados.titulo, margem, y);
  y += 18;

  if (dados.subtitulo) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(dados.subtitulo, margem, y);
    doc.setTextColor(0);
    y += 16;
  }

  const carimbo = new Date().toLocaleString("pt-BR");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Gerado pelo Ligaset em ${carimbo}`, margem, y);
  doc.setTextColor(0);
  y += 18;

  for (const sec of dados.secoes) {
    // Sobrou pouco espaço na folha: começa a seção na próxima.
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margem;
    }

    if (sec.titulo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(sec.titulo, margem, y);
      y += 14;
    }

    if (sec.colunas && sec.linhas) {
      autoTable(doc, {
        head: [sec.colunas],
        body: sec.linhas.length
          ? sec.linhas.map((l) => l.map((c) => String(c ?? "")))
          : [[{ content: "Sem dados.", colSpan: sec.colunas.length }]],
        startY: y,
        margin: { left: margem, right: margem },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [241, 245, 249], textColor: 30 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    } else if (sec.texto?.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const linha of sec.texto) {
        const quebradas = doc.splitTextToSize(linha, largura - margem * 2);
        for (const parte of quebradas) {
          if (y > doc.internal.pageSize.getHeight() - margem) {
            doc.addPage();
            y = margem;
          }
          doc.text(parte, margem, y);
          y += 14;
        }
      }
      y += 8;
    }
  }

  doc.save(nomeArquivo(dados.arquivo));
}
