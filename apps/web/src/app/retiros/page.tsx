'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useSession } from '../../lib/useSession';
import { PainelHeader } from '../../components/PainelHeader';
import { atualizarInscricao, criarRetiro, listarInscritos, listarRetiros } from '../../lib/retiros';
import type { InscricaoRetiro, Retiro } from '../../types/database';

export default function RetirosPage() {
  const { session, usuario, carregando } = useSession();
  const router = useRouter();

  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [retiroSelecionadoId, setRetiroSelecionadoId] = useState<string | null>(null);
  const [inscritos, setInscritos] = useState<InscricaoRetiro[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [numGrupos, setNumGrupos] = useState('4');

  useEffect(() => {
    if (!carregando && !session) router.replace('/login');
  }, [carregando, session, router]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    listarRetiros(usuario.comunidade_id).then((lista) => {
      setRetiros(lista);
      if (lista.length > 0) setRetiroSelecionadoId((atual) => atual ?? lista[0].id);
    });
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    if (!retiroSelecionadoId) {
      setInscritos([]);
      return;
    }
    listarInscritos(retiroSelecionadoId).then(setInscritos);
  }, [retiroSelecionadoId]);

  const retiroSelecionado = useMemo(
    () => retiros.find((r) => r.id === retiroSelecionadoId) ?? null,
    [retiros, retiroSelecionadoId]
  );

  const linkInscricao = retiroSelecionadoId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/inscricao/${retiroSelecionadoId}`
    : '';

  async function handleCriarRetiro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!usuario?.comunidade_id) return;
    const form = new FormData(e.currentTarget);
    const novo = await criarRetiro({
      comunidade_id: usuario.comunidade_id,
      nome: String(form.get('nome')),
      data_inicio: String(form.get('data_inicio')),
      data_fim: String(form.get('data_fim')),
      local: String(form.get('local') || '') || undefined,
      vagas: form.get('vagas') ? Number(form.get('vagas')) : undefined,
      valor: form.get('valor') ? Number(form.get('valor')) : undefined,
    });
    setRetiros((atual) => [novo, ...atual]);
    setRetiroSelecionadoId(novo.id);
    setMostrarForm(false);
    e.currentTarget.reset();
  }

  async function alterarInscricao(id: string, campos: Partial<InscricaoRetiro>) {
    setInscritos((atual) => atual.map((i) => (i.id === id ? { ...i, ...campos } : i)));
    await atualizarInscricao(id, campos as any);
  }

  function dividirGrupos() {
    const n = Math.max(1, Number(numGrupos) || 1);
    const atualizados = inscritos.map((inscrito, index) => ({
      ...inscrito,
      grupo: `Grupo ${(index % n) + 1}`,
    }));
    setInscritos(atualizados);
    atualizados.forEach((i) => atualizarInscricao(i.id, { grupo: i.grupo }));
  }

  function exportarExcel() {
    const linhas = inscritos.map((i) => ({
      Nome: i.nome ?? '',
      Telefone: i.telefone ?? '',
      Grupo: i.grupo ?? '',
      Pago: i.pagou ? 'Sim' : 'Não',
      'Valor pago': i.valor_pago ?? 0,
      Presente: i.presente ? 'Sim' : 'Não',
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Inscritos');
    XLSX.writeFile(livro, `${retiroSelecionado?.nome ?? 'retiro'}-inscritos.xlsx`);
  }

  async function exportarPdf() {
    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: `Lista de presença — ${retiroSelecionado?.nome ?? ''}`, style: 'titulo' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto'],
              body: [
                ['Nome', 'Grupo', 'Presente'],
                ...inscritos.map((i) => [i.nome ?? '', i.grupo ?? '', i.presente ? 'Sim' : '']),
              ],
            },
          },
        ],
        styles: { titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] } },
      })
      .download(`${retiroSelecionado?.nome ?? 'retiro'}-presenca.pdf`);
  }

  if (carregando || !session) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-[--color-primary-light] px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <PainelHeader titulo="Retiros" nomeUsuario={usuario?.nome} />

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          {/* Lista de retiros */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-700">Retiros</h2>
              <button
                onClick={() => setMostrarForm((v) => !v)}
                className="rounded-lg bg-[--color-primary] px-2 py-1 text-xs font-semibold text-white"
              >
                + Novo
              </button>
            </div>

            {mostrarForm && (
              <form onSubmit={handleCriarRetiro} className="mt-3 space-y-2 border-b border-zinc-100 pb-4">
                <input name="nome" placeholder="Nome do retiro" required className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                <div className="flex gap-2">
                  <input name="data_inicio" type="date" required className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                  <input name="data_fim" type="date" required className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </div>
                <input name="local" placeholder="Local" className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                <div className="flex gap-2">
                  <input name="vagas" type="number" placeholder="Vagas" className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                  <input name="valor" type="number" step="0.01" placeholder="Valor (R$)" className="w-1/2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </div>
                <button type="submit" className="w-full rounded-lg bg-[--color-primary] py-2 text-sm font-semibold text-white">
                  Criar retiro
                </button>
              </form>
            )}

            <ul className="mt-3 space-y-1">
              {retiros.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setRetiroSelecionadoId(r.id)}
                    className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                      r.id === retiroSelecionadoId ? 'bg-[--color-primary-light] font-semibold text-[--color-primary]' : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {r.nome}
                    <div className="text-xs text-zinc-400">
                      {new Date(r.data_inicio).toLocaleDateString('pt-BR')}
                    </div>
                  </button>
                </li>
              ))}
              {retiros.length === 0 && <p className="text-sm text-zinc-400">Nenhum retiro ainda.</p>}
            </ul>
          </div>

          {/* Detalhe do retiro */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            {!retiroSelecionado ? (
              <p className="text-sm text-zinc-500">Selecione ou crie um retiro.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-800">{retiroSelecionado.nome}</h2>
                    <p className="text-sm text-zinc-500">
                      {new Date(retiroSelecionado.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                      {new Date(retiroSelecionado.data_fim).toLocaleDateString('pt-BR')} ·{' '}
                      {retiroSelecionado.local ?? 'local não informado'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={exportarExcel} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600">
                      Exportar Excel
                    </button>
                    <button onClick={exportarPdf} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600">
                      Lista de presença (PDF)
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-3">
                  <p className="text-xs font-semibold text-zinc-500">Link de inscrição pública:</p>
                  <code className="rounded bg-white px-2 py-1 text-xs text-zinc-700">{linkInscricao}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(linkInscricao)}
                    className="rounded-lg bg-white px-2 py-1 text-xs text-[--color-primary]"
                  >
                    Copiar link
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <label className="text-xs font-semibold text-zinc-500">Dividir em</label>
                  <input
                    type="number"
                    min={1}
                    value={numGrupos}
                    onChange={(e) => setNumGrupos(e.target.value)}
                    className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-zinc-500">grupos (automático)</span>
                  <button onClick={dividirGrupos} className="rounded-lg bg-[--color-primary] px-3 py-1.5 text-xs font-semibold text-white">
                    Dividir grupos
                  </button>
                </div>

                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                      <th className="py-2">Nome</th>
                      <th>Grupo</th>
                      <th>Pago</th>
                      <th>Valor pago</th>
                      <th>Presente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inscritos.map((i) => (
                      <tr key={i.id} className="border-b border-zinc-50">
                        <td className="py-2 text-zinc-700">{i.nome ?? 'Sem nome'}</td>
                        <td>
                          <input
                            defaultValue={i.grupo ?? ''}
                            onBlur={(e) => alterarInscricao(i.id, { grupo: e.target.value })}
                            className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={i.pagou}
                            onChange={(e) => alterarInscricao(i.id, { pagou: e.target.checked })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={i.valor_pago ?? ''}
                            onBlur={(e) => alterarInscricao(i.id, { valor_pago: Number(e.target.value) || 0 })}
                            className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="text-zinc-500">{i.presente ? '✓' : '—'}</td>
                      </tr>
                    ))}
                    {inscritos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-zinc-400">
                          Nenhum inscrito ainda. Compartilhe o link de inscrição.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
