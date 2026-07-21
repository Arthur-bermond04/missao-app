'use client';

import { useCallback, useEffect, useState } from 'react';
import { HandHeart, Lock, CalendarPlus, FileDown } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { NovoMinisterioModal } from '@/components/ministerios/NovoMinisterioModal';
import { AbaMembros } from '@/components/ministerios/AbaMembros';
import { AbaPresenca } from '@/components/ministerios/AbaPresenca';
import { AbaCaixa } from '@/components/ministerios/AbaCaixa';
import { AbaDoacoes } from '@/components/ministerios/AbaDoacoes';
import { AgendarEncontroModal } from '@/components/ministerios/AgendarEncontroModal';
import { UpgradePlanoModal } from '@/components/configuracoes/UpgradePlanoModal';
import { buscarComunidade } from '@/lib/comunidades';
import { buscarPessoasParaCombobox } from '@/lib/pessoas';
import {
  calcularFrequencia,
  listarEncontros,
  listarFinanceiroMinisterio,
  listarMembrosMinisterio,
  listarMembrosPessoaMinisterio,
  listarMinisterios,
  listarPresencasDoMinisterio,
  type LancamentoDetalhe,
  type MembroDetalhe,
  type MembroPessoaDetalhe,
  type MinisterioComContagem,
} from '@/lib/ministerios';
import {
  TIPOS_MINISTERIO,
  type Comunidade,
  type MinisterioEncontro,
  type MinisterioPresenca,
  type Pessoa,
  type Usuario,
} from '@/types/database';

type Aba = 'membros' | 'presenca' | 'caixa' | 'doacoes';
const LIMITE_MINISTERIOS_SEMENTE = 2;

const TIPO_LABEL = Object.fromEntries(TIPOS_MINISTERIO.map((t) => [t.valor, t.label]));

export default function MinisteriosPage() {
  const { usuario } = usePainelSession();
  const comunidadeId = usuario?.comunidade_id ?? null;

  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [ministerios, setMinisterios] = useState<MinisterioComContagem[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('membros');
  const [modalNovo, setModalNovo] = useState(false);
  const [modalUpgrade, setModalUpgrade] = useState(false);
  const [modalAgendar, setModalAgendar] = useState(false);

  const [membros, setMembros] = useState<MembroDetalhe[]>([]);
  const [membrosPessoa, setMembrosPessoa] = useState<MembroPessoaDetalhe[]>([]);
  const [encontros, setEncontros] = useState<MinisterioEncontro[]>([]);
  const [presencas, setPresencas] = useState<MinisterioPresenca[]>([]);
  const [financeiro, setFinanceiro] = useState<LancamentoDetalhe[]>([]);

  const plano = comunidade?.plano ?? 'semente';
  const semCaixa = plano === 'semente';

  const carregarLista = useCallback(() => {
    if (!comunidadeId) return;
    listarMinisterios(comunidadeId).then((lista) => {
      setMinisterios(lista);
      setSelecionadoId((atual) => atual ?? lista[0]?.id ?? null);
    });
  }, [comunidadeId]);

  useEffect(() => {
    if (!comunidadeId) return;
    buscarComunidade(comunidadeId).then(setComunidade);
    supabase
      .from('usuarios')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .order('nome', { ascending: true })
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
    buscarPessoasParaCombobox(comunidadeId).then(setPessoas);
    carregarLista();
  }, [comunidadeId, carregarLista]);

  const carregarDetalhe = useCallback((ministerioId: string) => {
    Promise.all([
      listarMembrosMinisterio(ministerioId),
      listarMembrosPessoaMinisterio(ministerioId),
      listarEncontros(ministerioId),
      listarPresencasDoMinisterio(ministerioId),
      listarFinanceiroMinisterio(ministerioId),
    ]).then(([m, mp, e, p, f]) => {
      setMembros(m);
      setMembrosPessoa(mp);
      setEncontros(e);
      setPresencas(p);
      setFinanceiro(f);
    });
  }, []);

  useEffect(() => {
    if (selecionadoId) carregarDetalhe(selecionadoId);
  }, [selecionadoId, carregarDetalhe]);

  const selecionado = ministerios.find((m) => m.id === selecionadoId) ?? null;

  function handleNovo() {
    if (semCaixa && ministerios.length >= LIMITE_MINISTERIOS_SEMENTE) {
      setModalUpgrade(true);
      return;
    }
    setModalNovo(true);
  }

  async function exportarRelatorioMensal() {
    if (!selecionado) return;
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesIso = inicioMes.toISOString().slice(0, 10);

    const encontrosDoMes = encontros.filter((e) => e.status === 'realizado' && e.data >= inicioMesIso);
    const financeiroDoMes = financeiro.filter((f) => f.data >= inicioMesIso);
    const receitasDoMes = financeiroDoMes.filter((f) => f.tipo === 'receita').reduce((s, f) => s + f.valor, 0);
    const despesasDoMes = financeiroDoMes.filter((f) => f.tipo === 'despesa').reduce((s, f) => s + f.valor, 0);
    const frequencia = calcularFrequencia(encontros, presencas, 90);
    const doadores = new Map<string, number>();
    for (const f of financeiroDoMes) {
      if (f.tipo === 'receita' && f.doador_display) doadores.set(f.doador_display, (doadores.get(f.doador_display) ?? 0) + f.valor);
    }

    const { default: pdfMake } = await import('pdfmake/build/pdfmake');
    const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts.default?.vfs;

    pdfMake
      .createPdf({
        content: [
          { text: `Relatório mensal — ${selecionado.nome}`, style: 'titulo' },
          { text: 'Membros e frequência (90 dias)', style: 'secao' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: [['Nome', 'Frequência'], ...membros.map((m) => [m.nome, `${frequencia.get(m.usuario_id) ?? 0}%`])],
            },
          },
          { text: 'Extrato do caixa (mês atual)', style: 'secao' },
          { text: `Receitas: R$ ${receitasDoMes.toFixed(2)}   Despesas: R$ ${despesasDoMes.toFixed(2)}   Saldo: R$ ${(receitasDoMes - despesasDoMes).toFixed(2)}` },
          { text: 'Doadores do mês', style: 'secao' },
          doadores.size === 0
            ? { text: 'Nenhuma doação registrada este mês.', margin: [0, 0, 0, 8] }
            : {
                table: {
                  headerRows: 1,
                  widths: ['*', 'auto'],
                  body: [['Doador', 'Total'], ...Array.from(doadores.entries()).map(([nome, total]) => [nome, `R$ ${total.toFixed(2)}`])],
                },
              },
          { text: 'Encontros realizados no mês', style: 'secao' },
          encontrosDoMes.length === 0
            ? { text: 'Nenhum encontro realizado este mês.' }
            : { ul: encontrosDoMes.map((e) => `${new Date(e.data).toLocaleDateString('pt-BR')} — ${e.titulo}`) },
        ],
        styles: {
          titulo: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] },
          secao: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] },
        },
      })
      .download(`${selecionado.nome}-relatorio-mensal.pdf`);
  }

  const ABAS: { valor: Aba; label: string; bloqueada?: boolean }[] = [
    { valor: 'membros', label: 'Membros' },
    { valor: 'presenca', label: 'Presença' },
    { valor: 'caixa', label: 'Caixa', bloqueada: semCaixa },
    { valor: 'doacoes', label: 'Doações', bloqueada: semCaixa },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={HandHeart}
        title="Ministérios"
        subtitle="Grupos de serviço, presença e caixa"
        actions={<Button onClick={handleNovo}>+ Novo ministério</Button>}
      />

      {comunidadeId && (
        <NovoMinisterioModal
          open={modalNovo}
          onClose={() => setModalNovo(false)}
          comunidadeId={comunidadeId}
          usuarios={usuarios}
          onCriado={carregarLista}
        />
      )}
      <UpgradePlanoModal open={modalUpgrade} onClose={() => setModalUpgrade(false)} planoAtual={plano} />
      {selecionado && (
        <AgendarEncontroModal
          open={modalAgendar}
          onClose={() => setModalAgendar(false)}
          ministerioId={selecionado.id}
          onAgendado={() => {
            carregarDetalhe(selecionado.id);
            carregarLista();
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        {/* Lista */}
        <div className="rounded-lg bg-bg-card p-4 shadow-card">
          <h2 className="text-sm font-bold text-text-primary">Ministérios</h2>
          <div className="mt-3 space-y-2">
            {ministerios.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelecionadoId(m.id)}
                className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                  m.id === selecionadoId ? 'border-primary bg-primary-xlight' : 'border-transparent hover:bg-bg-page'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: m.cor }} />
                  <span className="flex-1 text-sm font-semibold text-text-primary">{m.nome}</span>
                  {!m.ativo && <Badge variant="inativo" showIcon={false} />}
                </div>
                <div className="mt-1 flex items-center gap-2 pl-5 text-xs text-text-secondary">
                  <span className="rounded-full bg-bg-page px-2 py-0.5">{TIPO_LABEL[m.tipo]}</span>
                  <span>{m.total_membros} membros</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-5 text-xs text-text-secondary">
                  {m.frequencia_media_3 != null && <span>Presença: {m.frequencia_media_3}%</span>}
                  <span className={m.saldo_caixa >= 0 ? 'text-accent' : 'text-danger'}>
                    Caixa: R$ {m.saldo_caixa.toFixed(2)}
                  </span>
                  {m.proximo_encontro && (
                    <span>Próximo: {new Date(m.proximo_encontro.data).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {ministerios.length === 0 && (
            <EmptyState
              icon={HandHeart}
              title="Nenhum ministério ainda"
              description="Crie o primeiro ministério da sua comunidade."
              action={{ label: '+ Novo ministério', onClick: handleNovo }}
            />
          )}
        </div>

        {/* Detalhe */}
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          {!selecionado ? (
            <p className="text-sm text-text-secondary">Selecione ou crie um ministério.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: selecionado.cor }} />
                  <h2 className="text-lg font-bold text-text-primary">{selecionado.nome}</h2>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={CalendarPlus} onClick={() => setModalAgendar(true)}>
                    Agendar encontro
                  </Button>
                  <Button size="sm" variant="secondary" icon={FileDown} onClick={exportarRelatorioMensal}>
                    Relatório do mês
                  </Button>
                </div>
              </div>
              {!!selecionado.descricao && (
                <p className="mt-1 text-sm text-text-secondary">{selecionado.descricao}</p>
              )}

              <div className="mt-4 flex gap-1 border-b border-border">
                {ABAS.map((a) => (
                  <button
                    key={a.valor}
                    onClick={() => setAba(a.valor)}
                    className={`flex items-center gap-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                      aba === a.valor
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {aba === 'membros' && comunidadeId && (
                  <AbaMembros
                    ministerio={selecionado}
                    membros={membros}
                    membrosPessoa={membrosPessoa}
                    encontros={encontros}
                    presencas={presencas}
                    usuarios={usuarios}
                    pessoas={pessoas}
                    onRefresh={() => {
                      carregarDetalhe(selecionado.id);
                      carregarLista();
                    }}
                  />
                )}
                {aba === 'presenca' && <AbaPresenca membros={membros} encontros={encontros} presencas={presencas} />}
                {(aba === 'caixa' || aba === 'doacoes') && semCaixa ? (
                  <EmptyState
                    icon={Lock}
                    title="Disponível no plano Missão"
                    description="Controle o caixa do ministério, registre doações e gere relatórios de doadores."
                    action={{ label: 'Ver planos', onClick: () => setModalUpgrade(true) }}
                  />
                ) : (
                  <>
                    {aba === 'caixa' && comunidadeId && (
                      <AbaCaixa
                        ministerio={selecionado}
                        comunidadeId={comunidadeId}
                        lancamentos={financeiro}
                        usuarios={usuarios}
                        onRefresh={() => carregarDetalhe(selecionado.id)}
                      />
                    )}
                    {aba === 'doacoes' && <AbaDoacoes ministerio={selecionado} lancamentos={financeiro} />}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
