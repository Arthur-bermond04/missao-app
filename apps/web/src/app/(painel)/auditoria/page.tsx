'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScrollText, ShieldAlert } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportarExcel } from '@/lib/exportacao';
import {
  listarAuditoria,
  OPERACAO_LABEL,
  TABELA_LABEL,
  valorLegivel,
  type RegistroAuditoria,
} from '@/lib/auditoria';
import { toastError } from '@/lib/toast';

const OPCOES_TABELA = [
  { value: '', label: 'Todos os módulos' },
  ...Object.entries(TABELA_LABEL).map(([value, label]) => ({ value, label })),
];

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AuditoriaPage() {
  const { usuario, pode, permissoesCarregando } = usePainelSession();

  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [nomeUsuario, setNomeUsuario] = useState<Map<string, string>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [tabela, setTabela] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [desde, setDesde] = useState('');
  const [ate, setAte] = useState('');

  const podeVer = pode('auditoria', 'ver');

  function carregar() {
    if (!usuario?.comunidade_id || !podeVer) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    listarAuditoria(usuario.comunidade_id, {
      tabela: tabela || undefined,
      usuarioId: usuarioId || undefined,
      desde: desde || undefined,
      ate: ate || undefined,
    })
      .then(setRegistros)
      .catch((err) => toastError(err instanceof Error ? err.message : 'Erro ao carregar auditoria.'))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [usuario?.comunidade_id, podeVer]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    supabase
      .from('usuarios')
      .select('id, nome')
      .eq('comunidade_id', usuario.comunidade_id)
      .then(({ data }) =>
        setNomeUsuario(new Map(((data as { id: string; nome: string }[]) ?? []).map((u) => [u.id, u.nome])))
      );
  }, [usuario?.comunidade_id]);

  const opcoesUsuario = useMemo(
    () => [
      { value: '', label: 'Todos os usuários' },
      ...[...nomeUsuario.entries()].map(([value, label]) => ({ value, label })),
    ],
    [nomeUsuario]
  );

  function exportar() {
    exportarExcel(
      registros,
      [
        { header: 'Quando', render: (r) => dataHora(r.criado_em) },
        { header: 'Quem', render: (r) => (r.usuario_id ? nomeUsuario.get(r.usuario_id) ?? '—' : 'Sistema') },
        { header: 'Módulo', render: (r) => TABELA_LABEL[r.tabela] ?? r.tabela },
        { header: 'Operação', render: (r) => OPERACAO_LABEL[r.operacao] },
        { header: 'Campo', render: (r) => r.campo ?? '—' },
        { header: 'De', render: (r) => valorLegivel(r.valor_antigo) },
        { header: 'Para', render: (r) => valorLegivel(r.valor_novo) },
      ],
      'auditoria.xlsx',
      'Auditoria'
    );
  }

  if (permissoesCarregando) {
    return <p className="text-sm text-text-secondary">Carregando...</p>;
  }

  if (!podeVer) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader icon={ScrollText} title="Auditoria" subtitle="Histórico de alterações da comunidade" />
        <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
          <EmptyState
            icon={ShieldAlert}
            title="Sem acesso à auditoria"
            description="O histórico de alterações guarda dado pessoal de toda a comunidade. Peça ao admin para liberar o módulo Auditoria em Configurações › Permissões."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={ScrollText}
        title="Auditoria"
        subtitle="Quem alterou o quê, quando — registro imutável"
        actions={
          registros.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={exportar}>
              Exportar Excel
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 rounded-lg bg-bg-card p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Módulo" value={tabela} onChange={(e) => setTabela(e.target.value)} options={OPCOES_TABELA} />
          <Select
            label="Usuário"
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            options={opcoesUsuario}
          />
          <Input label="De" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input label="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={carregar} loading={carregando}>
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setTabela('');
                setUsuarioId('');
                setDesde('');
                setAte('');
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-bg-card p-4 shadow-card">
        {carregando ? (
          <p className="py-6 text-center text-sm text-text-secondary">Carregando...</p>
        ) : (
          <Table
            data={registros}
            rowKey={(r) => r.id}
            pageSize={25}
            emptyState={
              <EmptyState
                icon={ScrollText}
                title="Nenhuma alteração no período"
                description="Ajuste os filtros ou aguarde — o log só registra mudanças feitas a partir da instalação da auditoria."
              />
            }
            columns={[
              { key: 'criado_em', header: 'Quando', render: (r) => dataHora(r.criado_em) },
              {
                key: 'usuario',
                header: 'Quem',
                render: (r) => (r.usuario_id ? nomeUsuario.get(r.usuario_id) ?? '—' : 'Sistema'),
              },
              { key: 'tabela', header: 'Módulo', render: (r) => TABELA_LABEL[r.tabela] ?? r.tabela },
              { key: 'operacao', header: 'Operação', render: (r) => OPERACAO_LABEL[r.operacao] },
              { key: 'campo', header: 'Campo', render: (r) => r.campo ?? '—' },
              {
                key: 'valores',
                header: 'Mudança',
                render: (r) =>
                  r.operacao === 'UPDATE' ? (
                    <span className="text-xs">
                      <span className="text-text-secondary line-through">{valorLegivel(r.valor_antigo)}</span>
                      {' → '}
                      <span className="font-medium">{valorLegivel(r.valor_novo)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-text-secondary">registro inteiro</span>
                  ),
              },
            ]}
          />
        )}
      </div>

      <p className="mt-3 text-xs text-text-secondary">
        O conteúdo dos relatos pastorais e de outros campos livres aparece como “conteúdo omitido”: a auditoria registra
        que houve mudança, sem duplicar o dado confidencial em outra tabela.
      </p>
    </div>
  );
}
