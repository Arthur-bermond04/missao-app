'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, UserPlus, Search, HeartHandshake } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConvidarMembroModal } from '@/components/membros/ConvidarMembroModal';
import { EditarMembroModal } from '@/components/membros/EditarMembroModal';
import { desativarMembro, listarMembros, reativarMembro, PERFIL_LABEL, type MembroComContagem } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Perfil, Usuario } from '@/types/database';

const OPCOES_FILTRO_PERFIL: { value: string; label: string }[] = [
  { value: '', label: 'Todos os perfis' },
  ...(Object.entries(PERFIL_LABEL) as [Perfil, string][]).map(([value, label]) => ({ value, label })),
];

export default function MembrosPage() {
  const { usuario } = usePainelSession();

  const [membros, setMembros] = useState<MembroComContagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [modalConvidarAberto, setModalConvidarAberto] = useState(false);
  const [membroEditando, setMembroEditando] = useState<Usuario | null>(null);

  function carregar() {
    if (!usuario?.comunidade_id) return;
    setCarregando(true);
    listarMembros(usuario.comunidade_id)
      .then(setMembros)
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [usuario?.comunidade_id]);

  const membrosFiltrados = useMemo(() => {
    return membros.filter((m) => {
      if (filtroPerfil && m.perfil !== filtroPerfil) return false;
      if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [membros, busca, filtroPerfil]);

  async function handleDesativar(m: Usuario) {
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

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Users}
        title="Membros"
        subtitle="Missionários, líderes e coordenadores da comunidade"
        actions={
          <Button icon={UserPlus} onClick={() => setModalConvidarAberto(true)}>
            Convidar membro
          </Button>
        }
      />

      <ConvidarMembroModal
        open={modalConvidarAberto}
        onClose={() => setModalConvidarAberto(false)}
        onMembroCriado={carregar}
      />
      <EditarMembroModal
        membro={membroEditando}
        onClose={() => setMembroEditando(null)}
        onSalvo={(id, campos) => setMembros((atual) => atual.map((m) => (m.id === id ? { ...m, ...campos } : m)))}
      />

      <div className="mt-6 flex flex-wrap gap-3 rounded-lg bg-bg-card p-4 shadow-card">
        <div className="min-w-[220px] flex-1">
          <Input icon={Search} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome" />
        </div>
        <Select value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)} options={OPCOES_FILTRO_PERFIL} />
      </div>

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        {carregando ? (
          <p className="text-sm text-text-secondary">Carregando membros...</p>
        ) : (
          <Table
            data={membrosFiltrados}
            rowKey={(m) => m.id}
            columns={[
              {
                key: 'nome',
                header: 'Nome',
                render: (m) => (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                      {m.nome.slice(0, 2).toUpperCase()}
                    </div>
                    {m.nome}
                  </div>
                ),
              },
              { key: 'perfil', header: 'Perfil', render: (m) => <span className="text-text-secondary">{PERFIL_LABEL[m.perfil]}</span> },
              { key: 'contatos_cadastrados', header: 'Contatos cadastrados' },
              {
                key: 'ultimo_acesso',
                header: 'Último acesso',
                render: (m) => (m.ultimo_acesso ? new Date(m.ultimo_acesso).toLocaleDateString('pt-BR') : 'Nunca'),
              },
              { key: 'ativo', header: 'Status', render: (m) => <Badge variant={m.ativo ? 'ativo' : 'inativo'} /> },
            ]}
            rowActions={(m) => (
              <div className="flex items-center justify-end gap-2">
                <Link
                  href={`/pastoral?nome=${encodeURIComponent(m.nome)}${m.telefone ? `&telefone=${encodeURIComponent(m.telefone)}` : ''}`}
                  title="Iniciar/ver acompanhamento pastoral"
                  className="rounded-md p-1.5 text-primary hover:bg-primary-xlight"
                >
                  <HeartHandshake size={16} />
                </Link>
                <Button size="sm" variant="secondary" onClick={() => setMembroEditando(m)}>
                  Editar
                </Button>
                <Button size="sm" variant={m.ativo ? 'danger' : 'success'} onClick={() => handleDesativar(m)}>
                  {m.ativo ? 'Desativar' : 'Reativar'}
                </Button>
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
  );
}
