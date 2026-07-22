'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Tent, Search, HeartHandshake, IdCard, CircleCheck, CircleAlert, BellRing, ClipboardCheck } from 'lucide-react';
import { exportarExcel as exportarExcelLib, exportarPDF as exportarPDFLib } from '@/lib/exportacao';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { RetiroCard } from '@/components/retiros/RetiroCard';
import { NovoRetiroModal } from '@/components/retiros/NovoRetiroModal';
import { QrCodeInscricao } from '@/components/retiros/QrCodeInscricao';
import { ProgressBar } from '@/components/retiros/ProgressBar';
import { LembreteModal } from '@/components/retiros/LembreteModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  atualizarInscricao,
  atualizarStatusRetiro,
  contarInscritosPorRetiro,
  criarRetiro,
  listarInscritos,
  listarRetiros,
  pessoasComAcompanhamentoPastoral,
} from '@/lib/retiros';
import { promoverInscricaoParaPessoa } from '@/lib/pessoas';
import { buscarStatusIntegracoes, type StatusIntegracoes } from '@/lib/integracoes';
import { toastSuccess, toastError } from '@/lib/toast';
import type { InscricaoRetiro, Retiro, StatusRetiro } from '@/types/database';

export default function RetirosPage() {
  const { usuario } = usePainelSession();

  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [contagemInscritos, setContagemInscritos] = useState<Record<string, number>>({});
  const [retiroSelecionadoId, setRetiroSelecionadoId] = useState<string | null>(null);
  const [inscritos, setInscritos] = useState<InscricaoRetiro[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [criandoRetiro, setCriandoRetiro] = useState(false);
  const [numGrupos, setNumGrupos] = useState('4');
  const [modalDividirAberto, setModalDividirAberto] = useState(false);
  const [somenteSemGrupo, setSomenteSemGrupo] = useState(false);
  const [statusAlvo, setStatusAlvo] = useState<StatusRetiro | null>(null);
  const [buscaCheckIn, setBuscaCheckIn] = useState('');
  const [statusIntegracoes, setStatusIntegracoes] = useState<StatusIntegracoes | null>(null);
  const [pessoasAcompanhadas, setPessoasAcompanhadas] = useState<Set<string>>(new Set());
  const [modalLembrete, setModalLembrete] = useState(false);

  useEffect(() => {
    buscarStatusIntegracoes().then(setStatusIntegracoes);
  }, []);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    listarRetiros(usuario.comunidade_id).then((lista) => {
      setRetiros(lista);
      if (lista.length > 0) setRetiroSelecionadoId((atual) => atual ?? lista[0].id);
      contarInscritosPorRetiro(lista.map((r) => r.id)).then(setContagemInscritos);
    });
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    if (!retiroSelecionadoId) {
      setInscritos([]);
      return;
    }
    listarInscritos(retiroSelecionadoId).then((lista) => {
      setInscritos(lista);
      const pessoaIds = lista.map((i) => i.pessoa_id).filter((id): id is string => !!id);
      pessoasComAcompanhamentoPastoral(pessoaIds).then(setPessoasAcompanhadas);
    });
  }, [retiroSelecionadoId]);

  const retiroSelecionado = useMemo(
    () => retiros.find((r) => r.id === retiroSelecionadoId) ?? null,
    [retiros, retiroSelecionadoId]
  );

  const linkInscricao = retiroSelecionadoId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/inscricao/${retiroSelecionadoId}`
    : '';

  async function handleCadastrarEmPessoas(i: InscricaoRetiro) {
    if (!usuario?.comunidade_id || !retiroSelecionado) return;
    try {
      const pessoa = await promoverInscricaoParaPessoa(i, usuario.comunidade_id, usuario.id, {
        nome: retiroSelecionado.nome,
        data_inicio: retiroSelecionado.data_inicio,
      });
      setInscritos((atual) => atual.map((x) => (x.id === i.id ? { ...x, pessoa_id: pessoa.id } : x)));
      toastSuccess('Cadastrado em Pessoas!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao cadastrar em Pessoas.');
    }
  }

  async function handleCriarRetiro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!usuario?.comunidade_id) return;
    const form = new FormData(e.currentTarget);
    setCriandoRetiro(true);
    try {
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
      setModalAberto(false);
      toastSuccess('Retiro criado com sucesso!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao criar retiro. Tente novamente.');
    } finally {
      setCriandoRetiro(false);
    }
  }

  async function alterarInscricao(id: string, campos: Partial<InscricaoRetiro>) {
    setInscritos((atual) => atual.map((i) => (i.id === id ? { ...i, ...campos } : i)));
    try {
      await atualizarInscricao(id, campos as any);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    }
  }

  async function handleMudarStatus() {
    if (!retiroSelecionadoId || !statusAlvo) return;
    await atualizarStatusRetiro(retiroSelecionadoId, statusAlvo);
    setRetiros((atual) => atual.map((r) => (r.id === retiroSelecionadoId ? { ...r, status: statusAlvo } : r)));
    toastSuccess(
      statusAlvo === 'encerrado' ? 'Inscrições encerradas.' : 'Retiro marcado como realizado.'
    );
  }

  function dividirGrupos() {
    const n = Math.max(1, Number(numGrupos) || 1);
    let indice = 0;
    const alterados: InscricaoRetiro[] = [];
    const atualizados = inscritos.map((inscrito) => {
      if (somenteSemGrupo && inscrito.grupo) return inscrito;
      const novo = { ...inscrito, grupo: `Grupo ${(indice % n) + 1}` };
      indice += 1;
      alterados.push(novo);
      return novo;
    });
    setInscritos(atualizados);
    alterados.forEach((i) => atualizarInscricao(i.id, { grupo: i.grupo }));
    toastSuccess(
      somenteSemGrupo
        ? `${alterados.length} inscrito(s) sem grupo distribuído(s) em ${n} grupos.`
        : `Inscritos divididos em ${n} grupos.`
    );
  }

  function exportarExcel() {
    exportarExcelLib(
      inscritos,
      [
        { header: 'Nome', render: (i) => i.nome ?? '' },
        { header: 'Telefone', render: (i) => i.telefone ?? '' },
        { header: 'Grupo', render: (i) => i.grupo ?? '' },
        { header: 'Pago', render: (i) => (i.pagou ? 'Sim' : 'Não') },
        { header: 'Valor pago', render: (i) => i.valor_pago ?? 0 },
        { header: 'Presente', render: (i) => (i.presente ? 'Sim' : 'Não') },
      ],
      `${retiroSelecionado?.nome ?? 'retiro'}-inscritos.xlsx`,
      'Inscritos'
    );
  }

  function exportarListaPresenca() {
    exportarPDFLib(
      `Lista de presença — ${retiroSelecionado?.nome ?? ''}`,
      [
        {
          tipo: 'tabela',
          cabecalho: ['Nome', 'Grupo', 'Presente'],
          larguras: ['*', 'auto', 'auto'],
          linhas: inscritos.map((i) => [i.nome ?? '', i.grupo ?? '', i.presente ? 'Sim' : '']),
        },
      ],
      `${retiroSelecionado?.nome ?? 'retiro'}-presenca.pdf`
    );
  }

  // Relatório de verdade (não a lista de presença reaproveitada) — estatísticas
  // do retiro: presença, arrecadação vs. meta e distribuição por grupo.
  function exportarRelatorioCompleto() {
    if (!retiroSelecionado) return;
    const totalPresentes = inscritos.filter((i) => i.presente).length;
    const taxaPresenca = inscritos.length > 0 ? Math.round((totalPresentes / inscritos.length) * 100) : 0;
    const percArrecadacao = totalEsperado > 0 ? Math.round((totalArrecadado / totalEsperado) * 100) : 0;

    exportarPDFLib(
      `Relatório do retiro — ${retiroSelecionado.nome}`,
      [
        {
          tipo: 'tabela',
          cabecalho: ['Indicador', 'Valor'],
          larguras: ['*', 'auto'],
          linhas: [
            ['Inscritos', String(inscritos.length)],
            ['Presentes', `${totalPresentes} (${taxaPresenca}%)`],
            ['Arrecadado', `R$ ${totalArrecadado.toFixed(2)}`],
            ['Valor esperado', `R$ ${totalEsperado.toFixed(2)}`],
            ['Arrecadação vs. meta', `${percArrecadacao}%`],
          ],
        },
        { tipo: 'subtitulo', texto: 'Distribuição por grupo' },
        {
          tipo: 'tabela',
          cabecalho: ['Grupo', 'Inscritos'],
          larguras: ['*', 'auto'],
          linhas:
            grupos.length > 0 ? grupos.map(([nome, membros]) => [nome, String(membros.length)]) : [['Sem grupos definidos', '']],
        },
      ],
      `${retiroSelecionado.nome}-relatorio.pdf`
    );
  }

  const inscritosFiltrados = useMemo(() => {
    if (!buscaCheckIn.trim()) return inscritos;
    const termo = buscaCheckIn.toLowerCase();
    return inscritos.filter((i) => (i.nome ?? '').toLowerCase().includes(termo));
  }, [inscritos, buscaCheckIn]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, InscricaoRetiro[]>();
    for (const i of inscritos) {
      if (!i.grupo) continue;
      const lista = mapa.get(i.grupo) ?? [];
      lista.push(i);
      mapa.set(i.grupo, lista);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [inscritos]);

  const totalArrecadado = inscritos.reduce((s, i) => s + (i.valor_pago ?? 0), 0);
  const totalEsperado = (retiroSelecionado?.valor ?? 0) * (retiroSelecionado?.vagas ?? (inscritos.length || 1));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Tent}
        title="Retiros"
        subtitle="Inscrições, grupos e presença"
        actions={<Button onClick={() => setModalAberto(true)}>+ Novo retiro</Button>}
      />

      <NovoRetiroModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSubmit={handleCriarRetiro}
        salvando={criandoRetiro}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        {/* Lista de retiros */}
        <div className="rounded-lg bg-bg-card p-4 shadow-card">
          <h2 className="text-sm font-bold text-text-primary">Retiros</h2>

          <div className="mt-3 space-y-2">
            {retiros.map((r) => (
              <RetiroCard
                key={r.id}
                retiro={r}
                ativo={r.id === retiroSelecionadoId}
                totalInscritos={contagemInscritos[r.id] ?? 0}
                onClick={() => setRetiroSelecionadoId(r.id)}
              />
            ))}
          </div>

          {retiros.length === 0 && (
            <EmptyState
              icon={Tent}
              title="Ainda não há retiros cadastrados"
              description="Crie o primeiro retiro da sua comunidade e comece a organizar as inscrições."
              action={{ label: '+ Criar retiro', onClick: () => setModalAberto(true) }}
            />
          )}
        </div>

        {/* Detalhe do retiro */}
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          {!retiroSelecionado ? (
            <p className="text-sm text-text-secondary">Selecione ou crie um retiro.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">{retiroSelecionado.nome}</h2>
                    <Badge variant={retiroSelecionado.status} />
                  </div>
                  <p className="text-sm text-text-secondary">
                    {new Date(retiroSelecionado.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(retiroSelecionado.data_fim).toLocaleDateString('pt-BR')} ·{' '}
                    {retiroSelecionado.local ?? 'local não informado'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {retiroSelecionado.status === 'aberto' && (
                    <Button variant="secondary" size="sm" onClick={() => setStatusAlvo('encerrado')}>
                      Encerrar inscrições
                    </Button>
                  )}
                  {retiroSelecionado.status === 'encerrado' && (
                    <Button variant="secondary" size="sm" onClick={() => setStatusAlvo('realizado')}>
                      Marcar como realizado
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" icon={BellRing} onClick={() => setModalLembrete(true)}>
                    Enviar lembrete
                  </Button>
                  <Button variant="secondary" size="sm" onClick={exportarExcel}>
                    Exportar Excel
                  </Button>
                  <Button variant="secondary" size="sm" onClick={exportarListaPresenca}>
                    Lista de presença (PDF)
                  </Button>
                </div>
              </div>

              <ConfirmModal
                open={!!statusAlvo}
                onClose={() => setStatusAlvo(null)}
                onConfirm={handleMudarStatus}
                title={statusAlvo === 'realizado' ? 'Marcar retiro como realizado' : 'Encerrar inscrições'}
                description={
                  statusAlvo === 'realizado'
                    ? 'Isso libera o relatório pós-retiro (taxa de presença, arrecadação vs. meta). Deseja continuar?'
                    : 'Novas inscrições e edições de check-in continuam possíveis, mas o retiro deixa de aparecer como "aberto". Deseja continuar?'
                }
                confirmLabel={statusAlvo === 'realizado' ? 'Marcar como realizado' : 'Encerrar'}
                variant="primary"
              />

              {usuario?.comunidade_id && (
                <LembreteModal
                  open={modalLembrete}
                  onClose={() => setModalLembrete(false)}
                  retiro={retiroSelecionado}
                  totalInscritos={inscritos.length}
                  comunidadeId={usuario.comunidade_id}
                  remetenteId={usuario.id}
                />
              )}

              {/* Progresso */}
              <div className="mt-4 grid grid-cols-1 gap-4 rounded-md bg-bg-page p-4 sm:grid-cols-2">
                <ProgressBar
                  label="Vagas preenchidas"
                  valorAtual={`${inscritos.length} de ${retiroSelecionado.vagas ?? '—'}`}
                  percentual={retiroSelecionado.vagas ? (inscritos.length / retiroSelecionado.vagas) * 100 : 0}
                  color="primary"
                />
                <ProgressBar
                  label="Arrecadação"
                  valorAtual={`R$ ${totalArrecadado.toFixed(2)} de R$ ${totalEsperado.toFixed(2)}`}
                  percentual={totalEsperado > 0 ? (totalArrecadado / totalEsperado) * 100 : 0}
                  color="accent"
                />
              </div>

              {/* Relatório pós-retiro */}
              {retiroSelecionado.status === 'realizado' && (
                <div className="mt-4 rounded-md border border-primary/30 bg-primary-xlight p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                    <ClipboardCheck size={15} /> Relatório pós-retiro
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-text-secondary">Taxa de presença</p>
                      <p className="text-lg font-bold text-text-primary">
                        {inscritos.length > 0
                          ? `${Math.round((inscritos.filter((i) => i.presente).length / inscritos.length) * 100)}%`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Arrecadação vs. meta</p>
                      <p className="text-lg font-bold text-text-primary">
                        {totalEsperado > 0 ? `${Math.round((totalArrecadado / totalEsperado) * 100)}%` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Inscritos</p>
                      <p className="text-lg font-bold text-text-primary">{inscritos.length}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="mt-3" onClick={exportarRelatorioCompleto}>
                    Exportar relatório completo (PDF)
                  </Button>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-bg-page p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-text-secondary">Link de inscrição pública:</p>
                    {statusIntegracoes && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          statusIntegracoes.inscricaoPublica ? 'text-accent' : 'text-danger'
                        }`}
                      >
                        {statusIntegracoes.inscricaoPublica ? (
                          <>
                            <CircleCheck size={13} /> Link ativo
                          </>
                        ) : (
                          <>
                            <CircleAlert size={13} /> Configure SUPABASE_SERVICE_ROLE_KEY
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-white px-2 py-1 text-xs text-text-primary">{linkInscricao}</code>
                    <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(linkInscricao)}>
                      Copiar link
                    </Button>
                  </div>
                </div>
                <QrCodeInscricao link={linkInscricao} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <label className="text-xs font-semibold text-text-secondary">Dividir em</label>
                <input
                  type="number"
                  min={1}
                  value={numGrupos}
                  onChange={(e) => setNumGrupos(e.target.value)}
                  className="w-16 rounded-md border border-border px-2 py-1 text-sm"
                />
                <span className="text-xs text-text-secondary">grupos (automático)</span>
                <Button size="sm" onClick={() => setModalDividirAberto(true)}>
                  Dividir grupos
                </Button>
              </div>

              <ConfirmModal
                open={modalDividirAberto}
                onClose={() => setModalDividirAberto(false)}
                onConfirm={dividirGrupos}
                title="Dividir em grupos"
                description="Isso substitui os grupos definidos manualmente para os inscritos afetados. Deseja continuar?"
                confirmLabel="Dividir"
                variant="primary"
              >
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={somenteSemGrupo}
                    onChange={(e) => setSomenteSemGrupo(e.target.checked)}
                  />
                  Apenas para inscritos sem grupo definido
                </label>
              </ConfirmModal>

              {grupos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {grupos.map(([nome, membros]) => (
                    <div key={nome} className="rounded-md border border-border p-2">
                      <p className="text-xs font-bold text-primary">{nome}</p>
                      <ul className="mt-1 space-y-0.5">
                        {membros.map((m) => (
                          <li key={m.id} className="truncate text-xs text-text-secondary">
                            {m.nome ?? 'Sem nome'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <Input
                  icon={Search}
                  value={buscaCheckIn}
                  onChange={(e) => setBuscaCheckIn(e.target.value)}
                  placeholder="Buscar inscrito para check-in..."
                />
              </div>

              <div className="mt-3">
                <Table
                  data={inscritosFiltrados}
                  rowKey={(i) => i.id}
                  columns={[
                    { key: 'nome', header: 'Nome', render: (i) => i.nome ?? 'Sem nome' },
                    {
                      key: 'grupo',
                      header: 'Grupo',
                      render: (i) => (
                        <input
                          defaultValue={i.grupo ?? ''}
                          onBlur={(e) => alterarInscricao(i.id, { grupo: e.target.value })}
                          className="w-24 rounded-md border border-border px-2 py-1 text-xs"
                        />
                      ),
                    },
                    {
                      key: 'pagou',
                      header: 'Pago',
                      render: (i) => (
                        <input
                          type="checkbox"
                          checked={i.pagou}
                          onChange={(e) => alterarInscricao(i.id, { pagou: e.target.checked })}
                        />
                      ),
                    },
                    {
                      key: 'valor_pago',
                      header: 'Valor pago',
                      render: (i) => (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={i.valor_pago ?? ''}
                          onBlur={(e) => alterarInscricao(i.id, { valor_pago: Number(e.target.value) || 0 })}
                          className="w-20 rounded-md border border-border px-2 py-1 text-xs"
                        />
                      ),
                    },
                    {
                      key: 'presente',
                      header: 'Check-in',
                      render: (i) => (
                        <button
                          onClick={() => alterarInscricao(i.id, { presente: !i.presente })}
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            i.presente ? 'bg-accent-light text-accent' : 'bg-bg-page text-text-secondary hover:bg-primary-xlight'
                          }`}
                        >
                          {i.presente ? '✓ Presente' : 'Confirmar'}
                        </button>
                      ),
                    },
                  ]}
                  rowActions={(i) => (
                    <div className="flex items-center gap-1">
                      {i.pessoa_id ? (
                        <Link
                          href={`/pessoas/${i.pessoa_id}`}
                          title="Ver em Pessoas"
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary hover:bg-bg-page"
                        >
                          <IdCard size={12} /> Pessoas
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleCadastrarEmPessoas(i)}
                          title="Cadastrar em Pessoas"
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary hover:bg-bg-page"
                        >
                          <IdCard size={12} /> Pessoas
                        </button>
                      )}
                      {i.pessoa_id && pessoasAcompanhadas.has(i.pessoa_id) ? (
                        <Badge variant="ativo">Acompanhado</Badge>
                      ) : (
                        <Link
                          href={`/pastoral?nome=${encodeURIComponent(i.nome ?? '')}${
                            i.telefone ? `&telefone=${encodeURIComponent(i.telefone)}` : ''
                          }${i.pessoa_id ? `&pessoaId=${encodeURIComponent(i.pessoa_id)}` : ''}`}
                          title="Adicionar ao acompanhamento pastoral"
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-primary px-2 py-1 text-xs font-medium text-primary hover:bg-primary-xlight"
                        >
                          <HeartHandshake size={12} /> Pastoral
                        </Link>
                      )}
                    </div>
                  )}
                  emptyState={
                    <EmptyState
                      icon={Tent}
                      title="Nenhum inscrito ainda"
                      description="Compartilhe o link de inscrição pública para começar a receber inscrições."
                    />
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
