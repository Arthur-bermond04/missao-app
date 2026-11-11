'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Search, HeartHandshake, ShieldCheck, Pencil, UserX, UserCheck } from 'lucide-react';
import { exportarExcel as exportarExcelLib } from '@/lib/exportacao';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConvidarMembroModal } from '@/components/membros/ConvidarMembroModal';
import { EditarMembroModal } from '@/components/membros/EditarMembroModal';
import { PermissoesUsuarioModal } from '@/components/membros/PermissoesUsuarioModal';
import { PainelMembro } from '@/components/membros/PainelMembro';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { desativarMembro, listarMembros, reativarMembro, PERFIL_LABEL, type MembroComContagem } from '@/lib/usuarios';
import { listarMinisterios, type MinisterioComContagem } from '@/lib/ministerios';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Perfil, Usuario } from '@/types/database';
import { TituloCard } from '@/components/ui/TituloCard';

const OPCOES_FILTRO_PERFIL: { value: string; label: string }[] = [
  { value: '', label: 'Todas as funções' },
  ...(Object.entries(PERFIL_LABEL) as [Perfil, string][]).map(([value, label]) => ({ value, label })),
];

export default function MembrosPage() {
  const { usuario } = usePainelSession();
  // Gravar permissão de outra pessoa é só do admin (a RLS também exige).
  const ehAdmin = usuario?.perfil === 'admin';

  const [membros, setMembros] = useState<MembroComContagem[]>([]);
  const [ministerios, setMinisterios] = useState<MinisterioComContagem[]>([]);
  const [membrosPorMinisterio, setMembrosPorMinisterio] = useState<Map<string, Set<string>>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroMinisterio, setFiltroMinisterio] = useState('');
  const [modalConvidarAberto, setModalConvidarAberto] = useState(false);
  const [membroEditando, setMembroEditando] = useState<Usuario | null>(null);
  const [membroPermissoes, setMembroPermissoes] = useState<Usuario | null>(null);
  const [membroSelecionado, setMembroSelecionado] = useState<MembroComContagem | null>(null);
  const [membroParaDesativar, setMembroParaDesativar] = useState<Usuario | null>(null);

  function carregar() {
    if (!usuario?.comunidade_id) return;
    const comunidadeId = usuario.comunidade_id;
    listarMembros(comunidadeId)
      .then(setMembros)
      .finally(() => setCarregando(false));
    listarMinisterios(comunidadeId).then(async (lista) => {
      setMinisterios(lista);
      const ids = lista.map((m) => m.id);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from('ministerio_membros')
        .select('ministerio_id, usuario_id')
        .in('ministerio_id', ids)
        .eq('ativo', true)
        .not('usuario_id', 'is', null);
      const mapa = new Map<string, Set<string>>();
      for (const row of (data as { ministerio_id: string; usuario_id: string }[]) ?? []) {
        const set = mapa.get(row.usuario_id) ?? new Set<string>();
        set.add(row.ministerio_id);
        mapa.set(row.usuario_id, set);
      }
      setMembrosPorMinisterio(mapa);
    });
  }

  useEffect(carregar, [usuario?.comunidade_id]);

  const membrosFiltrados = useMemo(() => {
    return membros.filter((m) => {
      if (filtroPerfil && m.perfil !== filtroPerfil) return false;
      if (filtroMinisterio && !membrosPorMinisterio.get(m.id)?.has(filtroMinisterio)) return false;
      if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [membros, busca, filtroPerfil, filtroMinisterio, membrosPorMinisterio]);

  function exportarExcel() {
    exportarExcelLib(
      membrosFiltrados,
      [
        { header: 'Nome', render: (m) => m.nome },
        { header: 'Telefone', render: (m) => m.telefone ?? '' },
        { header: 'Perfil', render: (m) => PERFIL_LABEL[m.perfil] },
        { header: 'Contatos cadastrados', render: (m) => m.contatos_cadastrados },
        { header: 'Último acesso', render: (m) => (m.ultimo_acesso ? new Date(m.ultimo_acesso).toLocaleDateString('pt-BR') : 'Nunca') },
        { header: 'Ativo', render: (m) => (m.ativo ? 'Sim' : 'Não') },
      ],
      'membros.xlsx',
      'Membros'
    );
  }

  // Reativar não é destrutivo — executa direto. Desativar pede confirmação
  // (ver membroParaDesativar/ConfirmModal abaixo).
  async function handleAlternarAtivo(m: Usuario) {
    try {
      if (m.ativo) {
        await desativarMembro(m.id);
        toastSuccess(`${m.nome} foi desativado.`);
      } else {
        await reativarMembro(m.id);
        toastSuccess(`${m.nome} foi reativado.`);
      }
      setMembros((atual) => atual.map((x) => (x.id === m.id ? { ...x, ativo: !m.ativo } : x)));
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao atualizar membro.');
    }
  }

  function handleDesativar(m: Usuario) {
    if (m.ativo) {
      setMembroParaDesativar(m);
    } else {
      handleAlternarAtivo(m);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Users}
        tom="azul"
        title="Membros"
        subtitle="Missionários, líderes e coordenadores da comunidade"
        actions={
          <>
            <Button variant="secondary" onClick={exportarExcel}>
              Exportar Excel
            </Button>
            <Button icon={UserPlus} onClick={() => setModalConvidarAberto(true)}>
              Convidar membro
            </Button>
          </>
        }
      />

      <ConvidarMembroModal
        open={modalConvidarAberto}
        onClose={() => setModalConvidarAberto(false)}
        onMembroCriado={carregar}
      />
      <EditarMembroModal
        membro={membroEditando}
        membros={membros}
        onClose={() => setMembroEditando(null)}
        onSalvo={(id, campos) => setMembros((atual) => atual.map((m) => (m.id === id ? { ...m, ...campos } : m)))}
      />
      {usuario?.comunidade_id && (
        <PermissoesUsuarioModal
          membro={membroPermissoes}
          comunidadeId={usuario.comunidade_id}
          onClose={() => setMembroPermissoes(null)}
        />
      )}
      <PainelMembro
        membro={membroSelecionado}
        onClose={() => setMembroSelecionado(null)}
        onEditar={(m) => {
          setMembroSelecionado(null);
          setMembroEditando(m);
        }}
        onDesativar={(m) => {
          handleDesativar(m);
          setMembroSelecionado(null);
        }}
      />
      <ConfirmModal
        open={!!membroParaDesativar}
        onClose={() => setMembroParaDesativar(null)}
        onConfirm={async () => {
          if (membroParaDesativar) await handleAlternarAtivo(membroParaDesativar);
        }}
        title="Desativar membro"
        description={`Tem certeza? ${membroParaDesativar?.nome ?? 'Este membro'} perderá acesso ao app.`}
        confirmLabel="Desativar"
      />

      {/* Filtros: mesma altura (h-10), bordas sutis e foco com anel suave */}
      <div className="mt-8 rounded-xl border border-border-soft bg-bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] flex-1">
            <Input
              icon={Search}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome"
              aria-label="Buscar por nome"
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              aria-label="Filtrar por função"
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value)}
              options={OPCOES_FILTRO_PERFIL}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              aria-label="Filtrar por ministério"
              value={filtroMinisterio}
              onChange={(e) => setFiltroMinisterio(e.target.value)}
              options={[{ value: '', label: 'Todos os ministérios' }, ...ministerios.map((m) => ({ value: m.id, label: m.nome }))]}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border-soft bg-bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
          <TituloCard icone="pessoas">Equipe com acesso</TituloCard>
          {!carregando && (
            <span className="text-sm text-text-secondary">
              <strong className="font-semibold text-text-primary">{membrosFiltrados.length}</strong>{' '}
              {membrosFiltrados.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          )}
        </div>

        <div className="px-2 pb-3 pt-1 sm:px-3">
          {carregando ? (
            <p className="px-4 py-8 text-sm text-text-secondary">Carregando membros...</p>
          ) : (
            <Table
              data={membrosFiltrados}
              rowKey={(m) => m.id}
              acoesSempreVisiveis
              columns={[
                {
                  key: 'nome',
                  header: 'Nome',
                  render: (m) => (
                    <button
                      onClick={() => setMembroSelecionado(m)}
                      className="flex items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      title="Ver perfil"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-xlight text-xs font-semibold text-primary">
                        {m.nome.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text-primary hover:text-primary">{m.nome}</span>
                        {!!m.telefone && <span className="block truncate text-xs text-text-secondary">{m.telefone}</span>}
                      </span>
                    </button>
                  ),
                },
                { key: 'perfil', header: 'Função', render: (m) => <span className="text-text-primary">{PERFIL_LABEL[m.perfil]}</span> },
                {
                  key: 'contatos_cadastrados',
                  header: 'Contatos',
                  align: 'right',
                  render: (m) => <span className="tabular-nums">{m.contatos_cadastrados}</span>,
                },
                {
                  key: 'ultimo_acesso',
                  header: 'Último acesso',
                  render: (m) =>
                    m.ultimo_acesso ? (
                      <span className="tabular-nums">{new Date(m.ultimo_acesso).toLocaleDateString('pt-BR')}</span>
                    ) : (
                      <span className="text-text-secondary">Nunca</span>
                    ),
                },
                { key: 'ativo', header: 'Status', render: (m) => <Badge variant={m.ativo ? 'ativo' : 'inativo'} /> },
              ]}
              rowActions={(m) => (
                <div className="flex items-center justify-end gap-1.5">
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setMembroEditando(m)}>
                    Editar
                  </Button>
                  <MenuAcoes
                    rotulo={`Mais ações para ${m.nome}`}
                    itens={[
                      ...(ehAdmin
                        ? [{ label: 'Permissões', icon: ShieldCheck, onClick: () => setMembroPermissoes(m) }]
                        : []),
                      {
                        label: 'Acompanhamento pastoral',
                        icon: HeartHandshake,
                        href: `/pastoral?nome=${encodeURIComponent(m.nome)}${m.telefone ? `&telefone=${encodeURIComponent(m.telefone)}` : ''}`,
                      },
                      {
                        label: m.ativo ? 'Desativar acesso' : 'Reativar acesso',
                        icon: m.ativo ? UserX : UserCheck,
                        perigo: m.ativo,
                        separadorAntes: true,
                        onClick: () => handleDesativar(m),
                      },
                    ]}
                  />
                </div>
              )}
              emptyState={
                <EmptyState
                  icon={Users}
                  title="Nenhum membro encontrado"
                  description="Convide o primeiro membro da sua equipe para começar."
                  action={{ label: 'Convidar membro', onClick: () => setModalConvidarAberto(true) }}
                />
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
