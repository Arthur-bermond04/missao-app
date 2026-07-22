'use client';

import { useEffect, useMemo, useState } from 'react';
import { Network, Search, Plus, XCircle, Trash2 } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { exportarExcel } from '@/lib/exportacao';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NivelEquipeBadge } from '@/components/equipe/NivelEquipeBadge';
import { NovoCargoModal } from '@/components/equipe/NovoCargoModal';
import { buscarPessoasParaCombobox } from '@/lib/pessoas';
import { encerrarCargo, excluirCargo, listarEquipeCargos, type EquipeCargoComVinculo } from '@/lib/equipe';
import { toastError, toastSuccess } from '@/lib/toast';
import { NIVEIS_EQUIPE, type Celula, type NivelEquipe, type Pessoa, type Usuario } from '@/types/database';

export default function EquipePage() {
  const { usuario } = usePainelSession();
  const comunidadeId = usuario?.comunidade_id ?? null;

  const [cargos, setCargos] = useState<EquipeCargoComVinculo[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroCelula, setFiltroCelula] = useState('');
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);

  const [modalNovo, setModalNovo] = useState(false);
  const [paraEncerrar, setParaEncerrar] = useState<EquipeCargoComVinculo | null>(null);
  const [paraExcluir, setParaExcluir] = useState<EquipeCargoComVinculo | null>(null);

  function carregar() {
    if (!comunidadeId) return;
    setCarregando(true);
    listarEquipeCargos(comunidadeId)
      .then(setCargos)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    if (!comunidadeId) return;
    carregar();
    buscarPessoasParaCombobox(comunidadeId).then(setPessoas);
    supabase
      .from('usuarios')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .order('nome', { ascending: true })
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
    supabase
      .from('celulas')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .eq('ativa', true)
      .order('nome', { ascending: true })
      .then(({ data }) => setCelulas((data as Celula[]) ?? []));
  }, [comunidadeId]);

  const cargosFiltrados = useMemo(() => {
    return cargos.filter((c) => {
      if (!mostrarEncerrados && !c.ativo) return false;
      if (filtroNivel && c.nivel !== filtroNivel) return false;
      if (filtroCelula && c.celula_id !== filtroCelula) return false;
      if (busca) {
        const termo = busca.toLowerCase();
        const nome = (c.pessoa_nome ?? c.usuario_nome ?? '').toLowerCase();
        if (!nome.includes(termo) && !c.cargo.toLowerCase().includes(termo)) return false;
      }
      return true;
    });
  }, [cargos, busca, filtroNivel, filtroCelula, mostrarEncerrados]);

  const cargosPorNivel = useMemo(() => {
    const mapa = new Map<NivelEquipe, EquipeCargoComVinculo[]>();
    for (const n of NIVEIS_EQUIPE) mapa.set(n.valor, []);
    for (const c of cargosFiltrados) mapa.get(c.nivel)?.push(c);
    return mapa;
  }, [cargosFiltrados]);

  async function handleEncerrar() {
    if (!paraEncerrar) return;
    try {
      await encerrarCargo(paraEncerrar.id);
      toastSuccess('Cargo encerrado.');
      setParaEncerrar(null);
      carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao encerrar cargo.');
    }
  }

  async function handleExcluir() {
    if (!paraExcluir) return;
    try {
      await excluirCargo(paraExcluir.id);
      toastSuccess('Cargo excluído.');
      setParaExcluir(null);
      carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir cargo.');
    }
  }

  function exportar() {
    exportarExcel(
      cargosFiltrados,
      [
        { header: 'Nome', render: (c) => c.pessoa_nome ?? c.usuario_nome ?? '' },
        { header: 'Cargo', render: (c) => c.cargo },
        { header: 'Nível', render: (c) => NIVEIS_EQUIPE.find((n) => n.valor === c.nivel)?.label ?? c.nivel },
        { header: 'Célula', render: (c) => c.celula_nome ?? '' },
        { header: 'Início', render: (c) => (c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : '') },
        { header: 'Status', render: (c) => (c.ativo ? 'Ativo' : 'Encerrado') },
      ],
      'equipe.xlsx',
      'Equipe'
    );
  }

  const isAdmin = usuario?.perfil === 'admin';

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Network}
        title="Equipe"
        subtitle="Estrutura, cargos e níveis da comunidade"
        actions={
          <>
            <Button variant="secondary" onClick={exportar}>
              Exportar Excel
            </Button>
            <Button icon={Plus} onClick={() => setModalNovo(true)}>
              Adicionar cargo
            </Button>
          </>
        }
      />

      {comunidadeId && (
        <NovoCargoModal
          open={modalNovo}
          onClose={() => setModalNovo(false)}
          comunidadeId={comunidadeId}
          pessoas={pessoas}
          usuarios={usuarios}
          celulas={celulas}
          onCriado={carregar}
        />
      )}

      <ConfirmModal
        open={!!paraEncerrar}
        onClose={() => setParaEncerrar(null)}
        onConfirm={handleEncerrar}
        title="Encerrar este cargo?"
        description={`${paraEncerrar?.pessoa_nome ?? paraEncerrar?.usuario_nome ?? 'Esta pessoa'} deixará de aparecer como ativo(a) em ${paraEncerrar?.cargo}. O histórico é mantido.`}
        confirmLabel="Encerrar"
        variant="primary"
      />
      <ConfirmModal
        open={!!paraExcluir}
        onClose={() => setParaExcluir(null)}
        onConfirm={handleExcluir}
        title="Excluir permanentemente?"
        description={`Isso remove o registro de ${paraExcluir?.cargo} de ${paraExcluir?.pessoa_nome ?? paraExcluir?.usuario_nome ?? 'esta pessoa'} para sempre. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />

      <div className="mt-6 flex flex-wrap gap-3 rounded-lg bg-bg-card p-4 shadow-card">
        <div className="min-w-[220px] flex-1">
          <Input icon={Search} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou cargo" />
        </div>
        <Select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          options={[{ value: '', label: 'Todos os níveis' }, ...NIVEIS_EQUIPE.map((n) => ({ value: n.valor, label: n.label }))]}
        />
        <Select
          value={filtroCelula}
          onChange={(e) => setFiltroCelula(e.target.value)}
          options={[{ value: '', label: 'Todas as células' }, ...celulas.map((c) => ({ value: c.id, label: c.nome }))]}
        />
        <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-text-secondary">
          <input type="checkbox" checked={mostrarEncerrados} onChange={(e) => setMostrarEncerrados(e.target.checked)} />
          Mostrar encerrados
        </label>
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-text-secondary">Carregando equipe...</p>
      ) : cargosFiltrados.length === 0 ? (
        <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
          <EmptyState
            icon={Network}
            title="Nenhum cargo cadastrado"
            description="Comece organizando a estrutura da sua comunidade — quem faz o quê, em qual nível."
            action={{ label: 'Adicionar cargo', onClick: () => setModalNovo(true) }}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {NIVEIS_EQUIPE.map((n) => {
            const lista = cargosPorNivel.get(n.valor) ?? [];
            if (lista.length === 0) return null;
            return (
              <div key={n.valor} className="rounded-lg bg-bg-card p-6 shadow-card">
                <div className="flex items-center gap-2">
                  <NivelEquipeBadge nivel={n.valor} />
                  <h2 className="text-sm font-bold text-text-primary">{n.label}</h2>
                  <span className="text-xs text-text-secondary">({lista.length})</span>
                </div>
                <div className="mt-3 space-y-2">
                  {lista.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-center justify-between rounded-md border border-border px-3 py-3 ${
                        c.ativo ? '' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                          {(c.pessoa_nome ?? c.usuario_nome ?? '??').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {c.pessoa_nome ?? c.usuario_nome}
                            {!c.ativo && <span className="ml-2 text-xs font-normal text-text-secondary">(encerrado)</span>}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {c.cargo}
                            {c.celula_nome ? ` · ${c.celula_nome}` : ''}
                            {c.data_inicio ? ` · desde ${new Date(c.data_inicio).toLocaleDateString('pt-BR')}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        {c.ativo && (
                          <button
                            onClick={() => setParaEncerrar(c)}
                            title="Encerrar cargo"
                            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-page hover:text-warning"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setParaExcluir(c)}
                            title="Excluir permanentemente"
                            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-page hover:text-danger"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
