import * as XLSX from 'xlsx';

export interface ColunaExport<T> {
  header: string;
  render: (item: T) => string | number;
}

// Substitui as implementações locais de "gerar planilha" espalhadas pelas
// telas — mesmo padrão (SheetJS) em todo lugar, uma linha de chamada só.
export function exportarExcel<T>(dados: T[], colunas: ColunaExport<T>[], nomeArquivo: string, nomeAba = 'Dados') {
  const linhas = dados.map((item) => {
    const linha: Record<string, string | number> = {};
    for (const col of colunas) linha[col.header] = col.render(item);
    return linha;
  });
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, nomeAba);
  XLSX.writeFile(livro, nomeArquivo.endsWith('.xlsx') ? nomeArquivo : `${nomeArquivo}.xlsx`);
}

export type SecaoPdf =
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'tabela'; cabecalho: string[]; linhas: (string | number)[][]; larguras?: (string | number)[] };

// Substitui as implementações locais de "gerar PDF" (pdfmake, import
// dinâmico) — cada tela monta só as seções de conteúdo, o resto (fonte,
// estilos, rodapé de confidencialidade) fica centralizado aqui.
async function importarPdfMake() {
  return (await import('pdfmake/build/pdfmake')).default;
}
type PdfMake = Awaited<ReturnType<typeof importarPdfMake>>;
type ArquivoVfs = { vfs?: Record<string, string> };

/**
 * Carrega o pdfmake e registra as fontes embutidas. Era repetido, com `any`, em
 * dez arquivos; agora todo PDF do app passa por aqui.
 */
export async function carregarPdfMake(): Promise<PdfMake> {
  const pdfMake = await importarPdfMake();
  const fontes = (await import('pdfmake/build/vfs_fonts')) as unknown as ArquivoVfs & {
    pdfMake?: ArquivoVfs;
    default?: ArquivoVfs;
  };
  (pdfMake as unknown as ArquivoVfs).vfs = fontes.pdfMake?.vfs ?? fontes.vfs ?? fontes.default?.vfs;
  return pdfMake;
}

export async function exportarPDF(titulo: string, secoes: SecaoPdf[], nomeArquivo: string, confidencial = false) {
  const pdfMake = await carregarPdfMake();

  const content: Record<string, unknown>[] = [{ text: titulo, style: 'titulo' }];

  for (const secao of secoes) {
    if (secao.tipo === 'subtitulo') {
      content.push({ text: secao.texto, style: 'secao' });
    } else if (secao.tipo === 'texto') {
      content.push({ text: secao.texto, margin: [0, 0, 0, 8] });
    } else if (secao.tipo === 'tabela') {
      content.push({
        table: {
          headerRows: 1,
          widths: secao.larguras ?? secao.cabecalho.map(() => '*'),
          body: [secao.cabecalho, ...secao.linhas],
        },
        margin: [0, 0, 0, 10],
      });
    }
  }

  if (confidencial) {
    content.push({ text: 'Documento confidencial — uso interno da liderança.', style: 'aviso', margin: [0, 12, 0, 0] });
  }

  pdfMake
    .createPdf({
      content,
      styles: {
        titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
        secao: { fontSize: 13, bold: true, margin: [0, 12, 0, 6] },
        aviso: { fontSize: 10, italics: true, color: '#DC2626' },
      },
    })
    .download(nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}
