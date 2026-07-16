'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useSession } from '../../lib/useSession';
import { PainelHeader } from '../../components/PainelHeader';
import { lancarFinanceiro, listarFinanceiro } from '../../lib/financeiro';
import { CATEGORIAS_FINANCEIRO, type Financeiro, type TipoFinanceiro } from '../../types/database';

function mesLabel(dataIso: string) {
  const [ano, mes] = dataIso.split('-');
  return `${mes}/${ano}`;
}

export default function FinanceiroPage() {
  const { session, usuario, carregando } = useSession();
  const router = useRouter();

  const [lancamentos, setLancamentos] = useState<Financeiro[]>([]);
  const [tipo, setTipo] = useState<TipoFinanceiro>('receita');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_FINANCEIRO[0]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);

  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    if (!carregando && !session) router.replace('/login');
  }, [carregando, session, router]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    listarFinanceiro(usuario.comunidade_id).then(setLancamentos);
  }, [usuario?.comunidade_id]);

  async function handleLancar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario?.comunidade_id || !valor) return;
    setSalvando(true);
    try {
      const novo = await lancarFinanceiro({
        comunidade_id: usuario.comunidade_id,
        tipo,
        categoria,
        descricao: descricao.trim() || undefined,
        valor: Number(valor),
        data,
      });
      setLancamentos((atual) => [novo, ...atual]);
      setDescricao('');
      setValor('');
    } finally {
      setSalvando(false);
    }
  }

  const filtrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroInicio && l.data < filtroInicio) return false;
      if (filtroFim && l.data > filtroFim) return false;
      if (filtroCategoria && l.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [lancamentos, filtroInicio, filtroFim, filtroCategoria]);

  const totalReceitas = filtrados.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = filtrados.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);

  const graficoMensal = useMemo(() => {
    const mapa = new Map<string, { receitas: number; despesas: number }>();
    for (const l of filtrados) {
      const chave = l.data.slice(0, 7);
      const atual = mapa.get(chave) ?? { receitas: 0, despesas: 0 };
      if (l.tipo === 'receita') atual.receitas += l.valor;
      else atual.despesas += l.valor;
      mapa.set(chave, atual);
    }
    return Array.from(mapa.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, valores]) => ({ mes: mesLabel(`${chave}-01`), ...valores }));
  }, [filtrados]);

  const maiorValorGrafico = Math.max(1, ...graficoMensal.flatMap((m) => [m.receitas, m.despesas]));

  function exportarExcel() {
    const linhas = filtrados.map((l) => ({
      Tipo: l.tipo,
      Categoria: l.categoria,
      Descrição: l.descricao ?? '',
      Valor: l.valor,
      Data: new Date(l.data).toLocaleDateString('pt-BR'),
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Financeiro');
    XLSX.writeFile(livro, 'financeiro.xlsx');
  }

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: 'Relatório financeiro', style: 'titulo' },
          { text: `Receitas: R$ ${totalReceitas.toFixed(2)}   Despesas: R$ ${totalDespesas.toFixed(2)}`, margin: [0, 0, 0, 10] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', 'auto', 'auto'],
              body: [
                ['Tipo', 'Categoria', 'Descrição', 'Valor', 'Data'],
                ...filtrados.map((l) => [
                  l.tipo,
                  l.categoria,
                  l.descricao ?? '',
                  `R$ ${l.valor.toFixed(2)}`,
                  new Date(l.data).toLocaleDateString('pt-BR'),
                ]),
              ],
            },
          },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] } },
      })
      .download('financeiro.pdf');
  }

  if (carregando || !session) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-[--color-primary-light] px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <PainelHeader titulo="Financeiro" nomeUsuario={usuario?.nome} />

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-700">Novo lançamento</h2>
            <form onSubmit={handleLancar} className="mt-3 space-y-2">
              <div className="flex gap-2">
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoFinanceiro)} className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
                  {CATEGORIAS_FINANCEIRO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição (opcional)"
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Valor (R$)"
                  required
                  className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                  className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={salvando}
                className="w-full rounded-lg bg-[--color-primary] py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Lançar'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-700">Resumo do período filtrado</h2>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-[--color-success] font-semibold">Receitas: R$ {totalReceitas.toFixed(2)}</span>
              <span className="text-red-500 font-semibold">Despesas: R$ {totalDespesas.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">Saldo: R$ {(totalReceitas - totalDespesas).toFixed(2)}</p>

            <div className="mt-4 space-y-2">
              {graficoMensal.map((m) => (
                <div key={m.mes}>
                  <p className="text-xs font-semibold text-zinc-500">{m.mes}</p>
                  <div className="mt-1 flex gap-1">
                    <div className="h-3 rounded-full bg-[--color-success]" style={{ width: `${(m.receitas / maiorValorGrafico) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex gap-1">
                    <div className="h-3 rounded-full bg-red-400" style={{ width: `${(m.despesas / maiorValorGrafico) * 100}%` }} />
                  </div>
                </div>
              ))}
              {graficoMensal.length === 0 && <p className="text-xs text-zinc-400">Sem lançamentos no período.</p>}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500">De</label>
                <input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500">Até</label>
                <input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500">Categoria</label>
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
                  <option value="">Todas</option>
                  {CATEGORIAS_FINANCEIRO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarExcel} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600">
                Exportar Excel
              </button>
              <button onClick={exportarPdf} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600">
                Exportar PDF
              </button>
            </div>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="py-2">Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id} className="border-b border-zinc-50">
                  <td className={`py-2 font-semibold ${l.tipo === 'receita' ? 'text-[--color-success]' : 'text-red-500'}`}>{l.tipo}</td>
                  <td className="text-zinc-600">{l.categoria}</td>
                  <td className="text-zinc-500">{l.descricao ?? ''}</td>
                  <td className="text-zinc-700">R$ {l.valor.toFixed(2)}</td>
                  <td className="text-zinc-500">{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-400">
                    Nenhum lançamento no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
