'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users2, Search, Plus, MapPin, Clock, UserRound, X } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Combobox } from '@/components/ui/Combobox';
import {
  atualizarCelula,
  criarCelula,
  desativarCelula,
  listarCelulas,
  listarMembrosDaCelula,
  reativarCelula,
  DIAS_SEMANA,
  DIA_LABEL,
  type CelulaComInfo,
  type MembroCelula,
} from '@/lib/celulas';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Usuario } from '@/types/database';

const PERFIS_GESTAO = ['lider', 'coordenador', 'admin'];

export default function CelulasPage() {
  const { usuario } = usePainelSession();
  const podeGerir = usuario ? PERFIS_GESTAO.includes(usuario.perfil) : false;

  const [celulas, setCelulas] = useState<CelulaComInfo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'ativas' | 'inativas' | 'todas'>('ativas');
  const [modalNova, setModalNova] = useState(false);
  const [editando, setEditando] = useState<CelulaComInfo | null>(null);
  const [detalhe, setDetalhe] = useState<CelulaComInfo | null>(null);
  const [paraDesativar, setParaDesativar] = useState<CelulaComInfo | null>(null);

  const carregar = useCallback(() => {
    if (!usuario?.comunidade_id) return;
    setCarregando(true);
    listarCelulas(usuario.comunidade_id)
      .then(setCelulas)
      .finally(() => setCarregando(false));
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    carregar();
    if (usuario?.comunidade_id) {
      supabase
        .from('usuarios')
        .select('*')
        .eq('comunidade_id', usuario.comunidade_id)
        .order('nome', { ascending: true })
        .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
    }
  }, [carregar, usuario?.comunidade_id]);

  const filtradas = useMemo(() => {
    return celulas.filter((c) => {
      if (filtro === 'ativas' && !c.ativa) return false;
      if (filtro === 'inativas' && c.ativa) return false;
      if (busca) {
        const termo = busca.toLowerCase();
        if (!c.nome.toLowerCase().includes(termo) && !(c.lider_nome ?? '').toLowerCase().includes(termo)) return false;
      }
      return true;
    });
  }, [celulas, filtro, busca]);

  const ativas = celulas.filter((c) => c.ativa).length;

  async function handleDesativar() {
    if (!paraDesativar) return;
    try {
      await desativarCelula(paraDesativar.id);
      toastSuccess('Célula desativada.');
      setParaDesativar(null);
      setDetalhe(null);
      carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao desativar.');
    }
  }

  async function handleReativar(c: CelulaComInfo) {
    try {
      await reativarCelula(c.id);
      toastSuccess('Célula reativada.');
      carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao reativar.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Users2}
        title="Células"
        subtitle={`${ativas} célula(s) ativa(s) na comunidade`}
        actions={
          podeGerir ? (
            <Button icon={Plus} onClick={() => setModalNova(true)}>
              Nova célula
            </Button>
          ) : undefined
        }
      />

      {(modalNova || editando) && usuario?.comunidade_id && (
        <CelulaModal
          comunidadeId={usuario.comunidade_id}
          usuarios={usuarios}
          celula={editando}
          onClose={() => {
            setModalNova(false);
            setEditando(null);
          }}
          onSalvo={() => {
            setModalNova(false);
            setEditando(null);
            carregar();
          }}
        />
      )}

      <ConfirmModal
        open={!!paraDesativar}
        onClose={() => setParaDesativar(null)}
        onConfirm={handleDesativar}
        title="Desativar célula"
        description={`${paraDesativar?.nome ?? 'Esta célula'} deixará de aparecer na lista de ativas. O histórico e os vínculos são mantidos.`}
        confirmLabel="Desativar"
        variant="primary"
      />

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-3 rounded-lg bg-bg-card p-4 shadow-card">
        <div className="min-w-[220px] flex-1">
          <Input icon={Search} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou líder" />
        </div>
        <Select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          options={[
            { value: 'ativas', label: 'Ativas' },
            { value: 'inativas', label: 'Inativas' },
            { value: 'todas', label: 'Todas' },
          ]}
        />
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-text-secondary">Carregando células...</p>
      ) : filtradas.length === 0 ? (
        <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
          <EmptyState
            icon={Users2}
            title="Nenhuma célula"
            description="Cadastre as células (pequenos grupos) da sua comunidade para organizar membros e reuniões."
            action={podeGerir ? { label: 'Nova célula', onClick: () => setModalNova(true) } : undefined}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtradas.map((c) => (
            <button
              key={c.id}
              onClick={() => setDetalhe(c)}
              className={`rounded-lg bg-bg-card p-5 text-left shadow-card transition-colors hover:bg-bg-page ${
                c.ativa ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary">{c.nome}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    c.ativa ? 'bg-primary-xlight text-primary' : 'bg-bg-page text-text-secondary'
                  }`}
                >
                  {c.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-text-secondary">
                <p className="flex items-center gap-1.5">
                  <UserRound size={12} /> {c.lider_nome ?? 'Sem líder definido'}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {c.dia_semana ? DIA_LABEL[c.dia_semana] ?? c.dia_semana : 'Dia não definido'}
                  {c.horario ? ` · ${c.horario}` : ''}
                </p>
                {!!c.endereco && (
                  <p className="flex items-center gap-1.5">
                    <MapPin size={12} /> {c.endereco}
                  </p>
                )}
                <p className="flex items-center gap-1.5 pt-1 font-medium text-text-primary">
                  <Users2 size={12} /> {c.total_membros} membro(s)
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Painel de detalhe */}
      {detalhe && (
        <DetalheCelula
          celula={detalhe}
          podeGerir={podeGerir}
          onClose={() => setDetalhe(null)}
          onEditar={() => {
            setEditando(detalhe);
            setDetalhe(null);
          }}
          onDesativar={() => setParaDesativar(detalhe)}
          onReativar={() => {
            handleReativar(detalhe);
            setDetalhe(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal criar/editar
// ---------------------------------------------------------------------------
function CelulaModal({
  comunidadeId,
  usuarios,
  celula,
  onClose,
  onSalvo,
}: {
  comunidadeId: string;
  usuarios: Usuario[];
  celula: CelulaComInfo | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const editando = !!celula;
  const [nome, setNome] = useState(celula?.nome ?? '');
  const [liderId, setLiderId] = useState(celula?.lider_id ?? '');
  const [dia, setDia] = useState(celula?.dia_semana ?? '');
  const [horario, setHorario] = useState(celula?.horario ?? '');
  const [endereco, setEndereco] = useState(celula?.endereco ?? '');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toastError('Informe o nome da célula.');
      return;
    }
    setSalvando(true);
    try {
      if (editando && celula) {
        await atualizarCelula(celula.id, {
          nome: nome.trim(),
          lider_id: liderId || null,
          dia_semana: dia || null,
          horario: horario || null,
          endereco: endereco.trim() || null,
        });
        toastSuccess('Célula atualizada!');
      } else {
        await criarCelula({
          comunidade_id: comunidadeId,
          nome: nome.trim(),
          lider_id: liderId || undefined,
          dia_semana: dia || undefined,
          horario: horario || undefined,
          endereco: endereco.trim() || undefined,
        });
        toastSuccess('Célula criada!');
      }
      onSalvo();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={editando ? 'Editar célula' : 'Nova célula'}>
      <form onSubmit={handleSalvar} className="space-y-3">
        <Input label="Nome da célula" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Combobox
          label="Líder responsável"
          value={liderId}
          onChange={setLiderId}
          placeholder="Buscar membro..."
          emptyMessage="Nenhum membro encontrado"
          options={usuarios.map((u) => ({ value: u.id, label: u.nome }))}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              label="Dia da semana"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              options={[{ value: '', label: 'Não definido' }, ...DIAS_SEMANA.map((d) => ({ value: d.valor, label: d.label }))]}
            />
          </div>
          <div className="w-32">
            <Input label="Horário" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
          </div>
        </div>
        <Input label="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Onde a célula se reúne" />
        <Button type="submit" fullWidth loading={salvando}>
          {editando ? 'Salvar alterações' : 'Criar célula'}
        </Button>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Painel lateral de detalhe
// ---------------------------------------------------------------------------
function DetalheCelula({
  celula,
  podeGerir,
  onClose,
  onEditar,
  onDesativar,
  onReativar,
}: {
  celula: CelulaComInfo;
  podeGerir: boolean;
  onClose: () => void;
  onEditar: () => void;
  onDesativar: () => void;
  onReativar: () => void;
}) {
  const [membros, setMembros] = useState<MembroCelula[]>([]);

  useEffect(() => {
    listarMembrosDaCelula(celula.id).then(setMembros).catch(() => setMembros([]));
  }, [celula.id]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-bg-card shadow-hover">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{celula.nome}</h2>
            <p className="text-sm text-text-secondary">{celula.ativa ? 'Célula ativa' : 'Célula inativa'}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-text-secondary hover:bg-bg-page">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <UserRound size={14} className="text-primary" />
              <span className="text-text-secondary">Líder:</span>
              <span className="font-medium text-text-primary">{celula.lider_nome ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-primary" />
              <span className="text-text-secondary">Reunião:</span>
              <span className="font-medium text-text-primary">
                {celula.dia_semana ? DIA_LABEL[celula.dia_semana] ?? celula.dia_semana : '—'}
                {celula.horario ? ` · ${celula.horario}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              <span className="text-text-secondary">Local:</span>
              <span className="font-medium text-text-primary">{celula.endereco ?? '—'}</span>
            </div>
          </dl>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Membros vinculados ({membros.length})
            </h3>
            {membros.length === 0 ? (
              <p className="mt-2 text-sm text-text-secondary">
                Ninguém vinculado ainda. Atribua uma célula ao cargo de alguém em <span className="font-medium">Equipe</span>.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {membros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="text-sm font-medium text-text-primary">{m.nome}</span>
                    <span className="text-xs text-text-secondary">{m.cargo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {podeGerir && (
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={onEditar}>
                Editar
              </Button>
              {celula.ativa ? (
                <Button variant="danger" fullWidth onClick={onDesativar}>
                  Desativar
                </Button>
              ) : (
                <Button variant="success" fullWidth onClick={onReativar}>
                  Reativar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
