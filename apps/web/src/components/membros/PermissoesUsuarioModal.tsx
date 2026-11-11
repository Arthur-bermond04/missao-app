'use client';

import { useAoMudar } from '@/lib/hooksEstado';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Caixa } from '@/components/configuracoes/AbaPermissoes';
import { PERFIL_LABEL } from '@/lib/usuarios';
import {
  ACAO_LABEL,
  aplicarAjustesDoUsuario,
  chaveCelula,
  listarModulos,
  listarPermissoes,
  listarPermissoesDoUsuario,
  podeNaMatriz,
  resolverMatriz,
  rotuloModulo,
  salvarPermissoesDoUsuario,
  type EstadoGrupo,
  type MatrizPermissoes,
} from '@/lib/permissoes';
import { toastError, toastSuccess } from '@/lib/toast';
import type { AcaoPermissao, PermissaoModulo, Usuario } from '@/types/database';

type Rascunho = Record<string, boolean>;

function estadoDe(modulos: PermissaoModulo[], rascunho: Rascunho): EstadoGrupo {
  let marcadas = 0;
  let total = 0;
  for (const m of modulos) {
    for (const a of m.acoes) {
      total += 1;
      if (rascunho[chaveCelula(m.chave, a)]) marcadas += 1;
    }
  }
  if (total === 0 || marcadas === 0) return 'nenhum';
  return marcadas === total ? 'todos' : 'parcial';
}

/**
 * Permissões de UM usuário. O admin escolhe, no seletor "Módulos", a área que
 * quer ajustar (ou todas), abre os grupos e marca o que a pessoa pode fazer. O
 * que coincide com a função (perfil) não vira ajuste: só a diferença é gravada
 * (ver salvarPermissoesDoUsuario).
 */
export function PermissoesUsuarioModal({
  membro,
  comunidadeId,
  onClose,
}: {
  membro: Usuario | null;
  comunidadeId: string;
  onClose: () => void;
}) {
  const [modulos, setModulos] = useState<PermissaoModulo[]>([]);
  const [base, setBase] = useState<MatrizPermissoes>({});
  const [rascunho, setRascunho] = useState<Rascunho>({});
  const [carregando, setCarregando] = useState(false);
  const [semTabela, setSemTabela] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  useAoMudar([membro], () => {
    if (!membro) return;
    setCarregando(true);
    setSemTabela(false);
    setBusca('');
    setGrupoFiltro('');
    setAbertos(new Set());
  });

  useEffect(() => {
    if (!membro) return;
    let cancelado = false;
    (async () => {
      try {
        const [mods, perms] = await Promise.all([listarModulos(), listarPermissoes(comunidadeId)]);
        const matrizBase = resolverMatriz(perms, membro.perfil, comunidadeId);
        let ajustes: Awaited<ReturnType<typeof listarPermissoesDoUsuario>> = [];
        try {
          ajustes = await listarPermissoesDoUsuario(membro.id);
        } catch {
          // A tabela usuario_permissoes ainda não existe: a tela abre, mas avisa.
          if (!cancelado) setSemTabela(true);
        }
        if (cancelado) return;
        const atual = aplicarAjustesDoUsuario(matrizBase, ajustes);
        const inicial: Rascunho = {};
        for (const m of mods) for (const a of m.acoes) inicial[chaveCelula(m.chave, a)] = podeNaMatriz(atual, m.chave, a);
        setModulos(mods);
        setBase(matrizBase);
        setRascunho(inicial);
      } catch (err) {
        if (!cancelado) toastError(err instanceof Error ? err.message : 'Erro ao carregar permissões.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [membro, comunidadeId]);

  const opcoesGrupo = useMemo(() => {
    const nomes = [...new Set(modulos.map((m) => m.grupo))];
    return [{ value: '', label: 'Todos os módulos' }, ...nomes.map((g) => ({ value: g, label: rotuloModulo(g) }))];
  }, [modulos]);

  const buscando = busca.trim().length > 0;

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapa = new Map<string, PermissaoModulo[]>();
    for (const m of modulos) {
      if (grupoFiltro && m.grupo !== grupoFiltro) continue;
      if (termo && !m.nome.toLowerCase().includes(termo) && !m.grupo.toLowerCase().includes(termo)) continue;
      mapa.set(m.grupo, [...(mapa.get(m.grupo) ?? []), m]);
    }
    return [...mapa.entries()];
  }, [modulos, busca, grupoFiltro]);

  const visiveis = useMemo(() => grupos.flatMap(([, lista]) => lista), [grupos]);

  /** Quantas células divergem do perfil (= quantos ajustes serão gravados). */
  const ajustes = useMemo(() => {
    let n = 0;
    for (const m of modulos) {
      for (const a of m.acoes) if (!!rascunho[chaveCelula(m.chave, a)] !== podeNaMatriz(base, m.chave, a)) n += 1;
    }
    return n;
  }, [modulos, rascunho, base]);

  const chavesDe = (lista: PermissaoModulo[]) => lista.flatMap((m) => m.acoes.map((a) => chaveCelula(m.chave, a)));

  function definir(chaves: string[], valor: boolean) {
    setRascunho((atual) => {
      const novo = { ...atual };
      for (const c of chaves) novo[c] = valor;
      return novo;
    });
  }

  function restaurarPerfil() {
    const inicial: Rascunho = {};
    for (const m of modulos) for (const a of m.acoes) inicial[chaveCelula(m.chave, a)] = podeNaMatriz(base, m.chave, a);
    setRascunho(inicial);
  }

  async function salvar() {
    if (!membro) return;
    setSalvando(true);
    try {
      await salvarPermissoesDoUsuario(comunidadeId, membro.id, modulos, rascunho, base);
      toastSuccess(`Permissões de ${membro.nome} salvas. Valem no próximo acesso dele.`);
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar permissões.');
    } finally {
      setSalvando(false);
    }
  }

  function alternarGrupo(grupo: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(grupo)) novo.delete(grupo);
      else novo.add(grupo);
      return novo;
    });
  }

  if (!membro) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Permissões de Usuário"
      description={`${membro.nome} · Função: ${PERFIL_LABEL[membro.perfil]}`}
      footer={
        <>
          <Button variant="ghost" icon={RotateCcw} onClick={restaurarPerfil} disabled={salvando || carregando}>
            Restaurar padrão da função
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={salvando}>
            Fechar
          </Button>
          <Button onClick={salvar} loading={salvando} disabled={carregando || semTabela}>
            Salvar
          </Button>
        </>
      }
    >
      {carregando ? (
        <p className="text-sm text-text-secondary">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {semTabela && (
            <div className="rounded-md bg-warning-light px-3 py-2 text-sm text-warning">
              O banco ainda não tem a tabela de permissões por usuário. Rode{' '}
              <code className="rounded bg-white/60 px-1">supabase/migrations/20261111100000_permissoes_por_usuario.sql</code>{' '}
              no SQL Editor do Supabase para poder salvar.
            </div>
          )}

          {/* Linha de controles, como na tela do Athenas: Módulos | Buscar | Seleção | Legenda */}
          <div className="grid items-start gap-4 md:grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_auto_auto]">
            <Select label="Módulos:" value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)} options={opcoesGrupo} />

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-text-secondary">Buscar menu:</span>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite o menu desejado"
                className="w-full rounded-sm border-[1.5px] border-border px-3 py-2.5 text-sm outline-none focus:border-accent-green focus:ring-[3px] focus:ring-accent-green/10"
              />
            </label>

            <div>
              <span className="mb-1 block text-xs font-semibold text-text-secondary">Seleção:</span>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => definir(chavesDe(visiveis), true)}>
                  Selecionar Todos
                </Button>
                <Button size="sm" variant="secondary" onClick={() => definir(chavesDe(visiveis), false)}>
                  Desmarcar Todos
                </Button>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold text-text-secondary">Legenda:</span>
              <div className="space-y-1 text-xs text-text-secondary">
                <span className="flex items-center gap-2">
                  <Caixa estado="todos" /> Habilitadas
                </span>
                <span className="flex items-center gap-2">
                  <Caixa estado="parcial" /> Habilitadas parcialmente
                </span>
                <span className="flex items-center gap-2">
                  <Caixa estado="nenhum" /> Não habilitadas
                </span>
                <span className="flex items-center gap-2">
                  <span className="mx-0.5 h-2.5 w-2.5 rounded-full bg-warning" /> Diferente da função
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-warning/40 bg-warning-light px-3 py-2.5 text-sm text-warning">
            Esta pessoa tem a função <strong>{PERFIL_LABEL[membro.perfil]}</strong>, que já libera alguns módulos. O que você
            marcar aqui vale só para {membro.nome} e vence a função.{' '}
            <strong>
              {ajustes === 0 ? 'Hoje está igual à função.' : `${ajustes} ${ajustes === 1 ? 'ajuste' : 'ajustes'} só para esta pessoa.`}
            </strong>{' '}
            Para mudar a função inteira, use <em>Editar</em> ou Configurações › Permissões.
          </div>

          <div className="max-h-[48vh] divide-y divide-border-soft overflow-y-auto rounded-md border border-border">
            {grupos.length === 0 && <p className="px-3 py-4 text-sm text-text-secondary">Nenhum módulo encontrado.</p>}
            {grupos.map(([grupo, lista]) => {
              const aberto = abertos.has(grupo) || buscando;
              return (
                <div key={grupo}>
                  <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-bg-page">
                    <button
                      type="button"
                      onClick={() => alternarGrupo(grupo)}
                      aria-expanded={aberto}
                      aria-label={aberto ? `Recolher ${grupo}` : `Expandir ${grupo}`}
                      className="text-text-secondary"
                    >
                      {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <Caixa
                      estado={estadoDe(lista, rascunho)}
                      onClick={() => definir(chavesDe(lista), estadoDe(lista, rascunho) !== 'todos')}
                    />
                    <button type="button" onClick={() => alternarGrupo(grupo)} className="text-sm font-medium text-text-primary">
                      {rotuloModulo(grupo)}
                    </button>
                    <span className="text-xs text-text-secondary">
                      {lista.length} {lista.length === 1 ? 'módulo' : 'módulos'}
                    </span>
                  </div>

                  {aberto && (
                    <div className="space-y-0.5 pb-2">
                      {lista.map((m) => (
                        <div key={m.chave} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-1.5 pl-11">
                          <span className="flex min-w-60 items-center gap-2">
                            <Caixa
                              estado={estadoDe([m], rascunho)}
                              onClick={() => definir(chavesDe([m]), estadoDe([m], rascunho) !== 'todos')}
                            />
                            <span className="text-sm text-text-primary">{rotuloModulo(m.nome)}</span>
                          </span>
                          <span className="flex flex-wrap gap-3">
                            {m.acoes.map((acao: AcaoPermissao) => {
                              const chave = chaveCelula(m.chave, acao);
                              const marcado = !!rascunho[chave];
                              const diferente = marcado !== podeNaMatriz(base, m.chave, acao);
                              return (
                                <span key={acao} className="flex items-center gap-1.5 text-xs">
                                  <Caixa estado={marcado ? 'todos' : 'nenhum'} onClick={() => definir([chave], !marcado)} />
                                  <span className="text-text-secondary">{ACAO_LABEL[acao]}</span>
                                  {diferente && (
                                    <span
                                      className="h-2 w-2 rounded-full bg-warning"
                                      title={`A função ${PERFIL_LABEL[membro.perfil]} ${podeNaMatriz(base, m.chave, acao) ? 'permite' : 'não permite'} isto; esta pessoa é diferente.`}
                                    />
                                  )}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-text-secondary">
            Quem barra de verdade é o banco: o menu e os dados seguem esta mesma regra. Desmarcar &quot;Ver&quot; esconde o
            item do menu.
          </p>
        </div>
      )}
    </Modal>
  );
}
