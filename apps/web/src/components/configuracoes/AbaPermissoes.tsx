'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Minus, RotateCcw } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PERFIL_LABEL } from '@/lib/usuarios';
import {
  ACAO_LABEL,
  definirPermissao,
  estadoDoGrupo,
  listarModulos,
  listarPermissoes,
  podeNaMatriz,
  resolverMatriz,
  type EstadoGrupo,
  type MatrizPermissoes,
} from '@/lib/permissoes';
import { toastError, toastSuccess } from '@/lib/toast';
import type { AcaoPermissao, Perfil, Permissao, PermissaoModulo } from '@/types/database';

const OPCOES_PERFIL = (Object.entries(PERFIL_LABEL) as [Perfil, string][]).map(([value, label]) => ({ value, label }));

/**
 * Caixa de três estados. "parcial" aparece quando um grupo tem parte das
 * ações marcadas — é o mesmo vocabulário da tela de permissões do Athenas
 * (habilitado / habilitado parcialmente / não habilitado).
 */
function Caixa({ estado, onClick }: { estado: EstadoGrupo; onClick?: () => void }) {
  const marcado = estado === 'todos';
  const parcial = estado === 'parcial';

  const classes = `flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
    marcado || parcial ? 'border-primary bg-primary text-white' : 'border-border bg-white'
  }`;

  const miolo = (
    <>
      {marcado && (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M2.5 6.5 5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {parcial && <Minus size={10} />}
    </>
  );

  // Sem onClick a caixa é só indicador — e precisa ser <span>, não <button>
  // desabilitado: a do cabeçalho do grupo fica dentro do botão que expande a
  // seção, e botão dentro de botão é HTML inválido (quebra a hidratação).
  if (!onClick) {
    return (
      <span role="checkbox" aria-checked={parcial ? 'mixed' : marcado} aria-disabled="true" className={`${classes} opacity-70`}>
        {miolo}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-checked={parcial ? 'mixed' : marcado}
      role="checkbox"
      className={`${classes} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-1`}
    >
      {miolo}
    </button>
  );
}

export function AbaPermissoes({ comunidadeId, ehAdmin }: { comunidadeId: string; ehAdmin: boolean }) {
  const [modulos, setModulos] = useState<PermissaoModulo[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [perfil, setPerfil] = useState<Perfil>('missionario');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    Promise.all([listarModulos(), listarPermissoes(comunidadeId)])
      .then(([m, p]) => {
        if (cancelado) return;
        setModulos(m);
        setPermissoes(p);
        setGruposAbertos(new Set(m.map((x) => x.grupo)));
      })
      // Falha aqui quase sempre é "tabela não existe"; o estado vazio abaixo
      // explica o que fazer, então não vale gritar um toast por cima.
      .catch(() => {
        if (!cancelado) {
          setModulos([]);
          setPermissoes([]);
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [comunidadeId]);

  const matriz: MatrizPermissoes = useMemo(
    () => resolverMatriz(permissoes, perfil, comunidadeId),
    [permissoes, perfil, comunidadeId]
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, PermissaoModulo[]>();
    for (const m of modulos) {
      mapa.set(m.grupo, [...(mapa.get(m.grupo) ?? []), m]);
    }
    return [...mapa.entries()];
  }, [modulos]);

  /** Um override existe quando a comunidade diverge do default do sistema. */
  const temOverride = useMemo(
    () => permissoes.some((p) => p.comunidade_id === comunidadeId && p.perfil === perfil),
    [permissoes, comunidadeId, perfil]
  );

  async function alternar(modulo: string, acao: AcaoPermissao) {
    if (!ehAdmin) return;
    const chave = `${modulo}.${acao}`;
    const novoValor = !podeNaMatriz(matriz, modulo, acao);
    setSalvando(chave);
    try {
      await definirPermissao(comunidadeId, perfil, modulo, acao, novoValor, permissoes);
      setPermissoes(await listarPermissoes(comunidadeId));
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar permissão.');
    } finally {
      setSalvando(null);
    }
  }

  /** Marca ou desmarca todas as ações de um módulo de uma vez. */
  async function alternarModulo(modulo: PermissaoModulo) {
    if (!ehAdmin) return;
    const estado = estadoDoGrupo([modulo], matriz);
    const novoValor = estado !== 'todos';
    setSalvando(modulo.chave);
    try {
      for (const acao of modulo.acoes) {
        await definirPermissao(comunidadeId, perfil, modulo.chave, acao, novoValor, permissoes);
      }
      setPermissoes(await listarPermissoes(comunidadeId));
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar permissões do módulo.');
    } finally {
      setSalvando(null);
    }
  }

  /** Remove os overrides do perfil, voltando aos defaults do sistema. */
  async function restaurarPadrao() {
    if (!ehAdmin) return;
    setSalvando('restaurar');
    try {
      for (const m of modulos) {
        for (const acao of m.acoes) {
          const padrao = permissoes.find(
            (p) => p.comunidade_id === null && p.perfil === perfil && p.modulo === m.chave && p.acao === acao
          );
          if (!padrao) continue;
          await definirPermissao(comunidadeId, perfil, m.chave, acao, padrao.permitido, permissoes);
        }
      }
      setPermissoes(await listarPermissoes(comunidadeId));
      toastSuccess(`Permissões de ${PERFIL_LABEL[perfil]} restauradas para o padrão.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao restaurar padrão.');
    } finally {
      setSalvando(null);
    }
  }

  function alternarGrupo(grupo: string) {
    setGruposAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(grupo)) novo.delete(grupo);
      else novo.add(grupo);
      return novo;
    });
  }

  if (carregando) return <p className="text-sm text-text-secondary">Carregando...</p>;

  // Sem catálogo não há o que configurar — é o sintoma de a migration de
  // permissões ainda não ter rodado neste banco. Enquanto isso o app funciona
  // com as regras anteriores (ver podeNoLegado em lib/permissoes.ts).
  if (modulos.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Permissões por perfil</h2>
        <div className="rounded-md bg-warning-light px-3 py-2 text-sm text-warning">
          A matriz de permissões ainda não existe neste banco.
        </div>
        <p className="text-sm text-text-secondary">
          Rode <code className="rounded bg-bg-page px-1">supabase/migrations/20260820030000_permissoes_hierarquia.sql</code>{' '}
          no SQL Editor do Supabase para habilitar esta tela.
        </p>
        <p className="text-sm text-text-secondary">
          Até lá o acesso segue as regras anteriores, com o perfil fixo — nada fica aberto por engano.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Permissões por perfil</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Escolha um perfil e marque o que ele pode fazer em cada módulo. Vale só para esta comunidade — o padrão do
          sistema continua intacto e serve de base para quem não tiver ajuste próprio.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select
            label="Perfil"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value as Perfil)}
            options={OPCOES_PERFIL}
          />
        </div>
        {ehAdmin && temOverride && (
          <Button size="sm" variant="secondary" onClick={restaurarPadrao} loading={salvando === 'restaurar'}>
            <RotateCcw size={14} className="mr-1.5" />
            Restaurar padrão
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 rounded-md bg-bg-page px-3 py-2 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Caixa estado="todos" /> Habilitado
        </span>
        <span className="flex items-center gap-1.5">
          <Caixa estado="parcial" /> Habilitado parcialmente
        </span>
        <span className="flex items-center gap-1.5">
          <Caixa estado="nenhum" /> Não habilitado
        </span>
      </div>

      <div className="divide-y divide-border rounded-md border border-border">
        {grupos.map(([grupo, modulosDoGrupo]) => {
          const aberto = gruposAbertos.has(grupo);
          return (
            <div key={grupo}>
              <button
                type="button"
                onClick={() => alternarGrupo(grupo)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-bg-page"
              >
                {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Caixa estado={estadoDoGrupo(modulosDoGrupo, matriz)} />
                <span className="text-sm font-medium text-text-primary">{grupo}</span>
              </button>

              {aberto && (
                <div className="space-y-1 pb-2">
                  {modulosDoGrupo.map((m) => (
                    <div key={m.chave} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-1.5 pl-10">
                      <span className="flex min-w-52 items-center gap-2">
                        <Caixa
                          estado={estadoDoGrupo([m], matriz)}
                          onClick={ehAdmin ? () => alternarModulo(m) : undefined}
                        />
                        <span className="text-sm text-text-primary">{m.nome}</span>
                      </span>
                      {/* Rótulo em <span>, não <label>: não está ligado a um
                          campo de formulário — quem carrega o estado e o clique
                          é a própria Caixa. */}
                      <span className="flex flex-wrap gap-3">
                        {m.acoes.map((acao) => (
                          <span
                            key={acao}
                            className={`flex items-center gap-1.5 text-xs ${
                              salvando === `${m.chave}.${acao}` ? 'opacity-50' : ''
                            }`}
                          >
                            <Caixa
                              estado={podeNaMatriz(matriz, m.chave, acao) ? 'todos' : 'nenhum'}
                              onClick={ehAdmin ? () => alternar(m.chave, acao) : undefined}
                            />
                            <span className="text-text-secondary">{ACAO_LABEL[acao]}</span>
                          </span>
                        ))}
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
        Quem barra de verdade é o banco (RLS). Esta tela alimenta as mesmas regras que o Postgres consulta, então
        desmarcar aqui bloqueia também o app mobile e qualquer acesso direto à API.
      </p>
    </div>
  );
}
