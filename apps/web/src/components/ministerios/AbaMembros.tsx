'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, CalendarPlus, ArrowRight, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Combobox } from '@/components/ui/Combobox';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RegistrarEncontroModal } from './RegistrarEncontroModal';
import {
  adicionarMembro,
  adicionarMembroPessoa,
  calcularFrequencia,
  type MembroDetalhe,
  type MembroPessoaDetalhe,
} from '@/lib/ministerios';
import { PERFIL_LABEL } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  CARGOS_MINISTERIO,
  type CargoMinisterio,
  type Ministerio,
  type MinisterioEncontro,
  type MinisterioPresenca,
  type Pessoa,
  type Usuario,
} from '@/types/database';

function iniciais(nome: string) {
  return nome.slice(0, 2).toUpperCase();
}

const CARGO_LABEL: Record<CargoMinisterio, string> = {
  coordenador: 'Coordenador',
  'vice-coordenador': 'Vice',
  membro: 'Membro',
};

interface AbaMembrosProps {
  ministerio: Ministerio;
  membros: MembroDetalhe[];
  membrosPessoa: MembroPessoaDetalhe[];
  encontros: MinisterioEncontro[];
  presencas: MinisterioPresenca[];
  usuarios: Usuario[];
  pessoas: Pessoa[];
  onRefresh: () => void;
}

export function AbaMembros({
  ministerio,
  membros,
  membrosPessoa,
  encontros,
  presencas,
  usuarios,
  pessoas,
  onRefresh,
}: AbaMembrosProps) {
  const [modoAdicionar, setModoAdicionar] = useState<'usuario' | 'pessoa'>('usuario');
  const [novoUsuarioId, setNovoUsuarioId] = useState('');
  const [novaPessoaId, setNovaPessoaId] = useState('');
  const [novoCargo, setNovoCargo] = useState<CargoMinisterio>('membro');
  const [adicionando, setAdicionando] = useState(false);
  const [modalEncontro, setModalEncontro] = useState(false);

  const frequencia = useMemo(() => calcularFrequencia(encontros, presencas, 90), [encontros, presencas]);

  const idsMembros = new Set(membros.map((m) => m.usuario_id));
  const usuariosDisponiveis = usuarios.filter((u) => !idsMembros.has(u.id));

  const idsMembrosPessoa = new Set(membrosPessoa.map((m) => m.pessoa_id));
  const pessoasDisponiveis = pessoas.filter((p) => !idsMembrosPessoa.has(p.id));

  const presencaPorEncontro = useMemo(() => {
    const mapa = new Map<string, { presentes: number; total: number }>();
    for (const p of presencas) {
      const atual = mapa.get(p.encontro_id) ?? { presentes: 0, total: 0 };
      atual.total += 1;
      if (p.presente) atual.presentes += 1;
      mapa.set(p.encontro_id, atual);
    }
    return mapa;
  }, [presencas]);

  async function handleAdicionar() {
    if (modoAdicionar === 'usuario') {
      if (!novoUsuarioId) return;
      setAdicionando(true);
      try {
        await adicionarMembro(ministerio.id, novoUsuarioId, novoCargo);
        setNovoUsuarioId('');
        setNovoCargo('membro');
        onRefresh();
        toastSuccess('Membro adicionado!');
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Erro ao adicionar membro.');
      } finally {
        setAdicionando(false);
      }
    } else {
      if (!novaPessoaId) return;
      setAdicionando(true);
      try {
        await adicionarMembroPessoa(ministerio.id, novaPessoaId, novoCargo);
        setNovaPessoaId('');
        setNovoCargo('membro');
        onRefresh();
        toastSuccess('Membro adicionado!');
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Erro ao adicionar membro.');
      } finally {
        setAdicionando(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      <RegistrarEncontroModal
        open={modalEncontro}
        onClose={() => setModalEncontro(false)}
        ministerioId={ministerio.id}
        membros={membros}
        membrosPessoa={membrosPessoa}
        onRegistrado={onRefresh}
      />

      {/* Adicionar membro */}
      <div className="rounded-lg bg-bg-page p-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setModoAdicionar('usuario')}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              modoAdicionar === 'usuario' ? 'bg-bg-card text-primary shadow-card' : 'text-text-secondary'
            }`}
          >
            Usuário do app
          </button>
          <button
            type="button"
            onClick={() => setModoAdicionar('pessoa')}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              modoAdicionar === 'pessoa' ? 'bg-bg-card text-primary shadow-card' : 'text-text-secondary'
            }`}
          >
            Pessoa cadastrada (sem login)
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          {modoAdicionar === 'usuario' ? (
            <div className="min-w-[200px] flex-1">
              <Combobox
                label="Adicionar membro"
                value={novoUsuarioId}
                onChange={setNovoUsuarioId}
                placeholder="Buscar por nome..."
                emptyMessage="Nenhum usuário encontrado"
                options={usuariosDisponiveis.map((u) => ({
                  value: u.id,
                  label: u.nome,
                  sublabel: PERFIL_LABEL[u.perfil],
                }))}
              />
            </div>
          ) : (
            <div className="min-w-[200px] flex-1">
              <Combobox
                label="Adicionar pessoa"
                value={novaPessoaId}
                onChange={setNovaPessoaId}
                placeholder="Buscar em Pessoas..."
                emptyMessage="Nenhuma pessoa encontrada"
                options={pessoasDisponiveis.map((p) => ({ value: p.id, label: p.nome, sublabel: p.telefone ?? undefined }))}
              />
            </div>
          )}
          <div className="w-40">
            <Select
              label="Cargo"
              value={novoCargo}
              onChange={(e) => setNovoCargo(e.target.value as CargoMinisterio)}
              options={CARGOS_MINISTERIO.map((c) => ({ value: c.valor, label: c.label }))}
            />
          </div>
          <Button
            icon={Plus}
            onClick={handleAdicionar}
            loading={adicionando}
            disabled={modoAdicionar === 'usuario' ? !novoUsuarioId : !novaPessoaId}
          >
            Adicionar
          </Button>
          <Button variant="secondary" icon={CalendarPlus} onClick={() => setModalEncontro(true)}>
            Registrar encontro
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          {modoAdicionar === 'usuario' ? (
            <>
              Não encontrou a pessoa? Cadastre em{' '}
              <Link href="/pessoas" className="inline-flex items-center gap-0.5 font-medium text-primary">
                Pessoas <ArrowRight size={12} />
              </Link>{' '}
              (sem login) ou{' '}
              <Link href="/membros" className="inline-flex items-center gap-0.5 font-medium text-primary">
                Membros <ArrowRight size={12} />
              </Link>{' '}
              (com login, para presença/encontros).
            </>
          ) : (
            'Membros sem login não entram na presença de encontros — apenas na lista e no caixa.'
          )}
        </p>
      </div>

      {/* Lista de membros */}
      {membros.length === 0 ? (
        <EmptyState icon={Plus} title="Nenhum membro ainda" description="Adicione o primeiro membro deste ministério." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-page text-xs uppercase text-text-secondary">
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Cargo</th>
                <th className="px-3 py-2">Entrou em</th>
                <th className="px-3 py-2">Frequência (3m)</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => {
                const freq = frequencia.get(m.usuario_id);
                const baixa = freq != null && freq < 50;
                return (
                  <tr key={m.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                          {iniciais(m.nome)}
                        </div>
                        {m.nome}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{CARGO_LABEL[m.cargo]}</td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {new Date(m.entrou_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={baixa ? 'font-semibold text-warning' : 'text-text-primary'}>
                        {freq != null ? `${freq}%` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={m.ativo ? 'ativo' : 'inativo'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Membros sem login (Pessoas) */}
      {membrosPessoa.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1 text-sm font-bold text-text-primary">
            <IdCard size={14} /> Membros sem login ({membrosPessoa.length})
          </h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-page text-xs uppercase text-text-secondary">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Cargo</th>
                  <th className="px-3 py-2">Entrou em</th>
                </tr>
              </thead>
              <tbody>
                {membrosPessoa.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2.5">
                      <Link href={`/pessoas/${m.pessoa_id}`} className="flex items-center gap-2 hover:text-primary">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                          {iniciais(m.nome)}
                        </div>
                        {m.nome}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{CARGO_LABEL[m.cargo]}</td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {new Date(m.entrou_em).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histórico de encontros */}
      <div>
        <h3 className="text-sm font-bold text-text-primary">Histórico de encontros</h3>
        {encontros.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Nenhum encontro registrado ainda.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {encontros.map((e) => {
              const p = presencaPorEncontro.get(e.id);
              const taxa = p && p.total > 0 ? Math.round((p.presentes / p.total) * 100) : 0;
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{e.titulo}</p>
                    <p className="text-xs text-text-secondary">{new Date(e.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="text-sm text-text-secondary">{taxa}% presença</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
