'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Filter, PartyPopper, HeartHandshake } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import * as XLSX from 'xlsx';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ETAPAS_FUNIL, type Contato, type Usuario } from '@/types/database';

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export default function FunilPage() {
  const { usuario } = usePainelSession();

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [missionarios, setMissionarios] = useState<Usuario[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [missionarioId, setMissionarioId] = useState('');
  const [local, setLocal] = useState('');

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    setCarregandoDados(true);
    Promise.all([
      supabase
        .from('contatos')
        .select('*')
        .eq('comunidade_id', usuario.comunidade_id)
        .order('data_abordagem', { ascending: false }),
      supabase
        .from('usuarios')
        .select('*')
        .eq('comunidade_id', usuario.comunidade_id)
        .eq('perfil', 'missionario'),
    ]).then(([contatosRes, missionariosRes]) => {
      setContatos((contatosRes.data as Contato[]) ?? []);
      setMissionarios((missionariosRes.data as Usuario[]) ?? []);
      setCarregandoDados(false);
    });
  }, [usuario?.comunidade_id]);

  const contatosFiltrados = useMemo(() => {
    return contatos.filter((c) => {
      const data = c.data_abordagem.slice(0, 10);
      if (dataInicio && data < dataInicio) return false;
      if (dataFim && data > dataFim) return false;
      if (missionarioId && c.missionario_id !== missionarioId) return false;
      if (local && !(c.local_abordagem ?? '').toLowerCase().includes(local.toLowerCase()))
        return false;
      return true;
    });
  }, [contatos, dataInicio, dataFim, missionarioId, local]);

  const funil = useMemo(() => {
    return ETAPAS_FUNIL.map((etapa, index) => {
      const total = contatosFiltrados.filter((c) => {
        const indiceContato = ETAPAS_FUNIL.findIndex((e) => e.valor === c.etapa_jornada);
        return indiceContato >= index;
      }).length;
      return { ...etapa, total };
    });
  }, [contatosFiltrados]);

  const maiorTotal = funil[0]?.total || 1;

  const travados = useMemo(() => {
    const agora = Date.now();
    return contatosFiltrados.filter((c) => {
      if (c.etapa_jornada !== 'abordagem') return false;
      const dataAbordagem = new Date(c.data_abordagem).getTime();
      return agora - dataAbordagem > TRINTA_DIAS_MS;
    });
  }, [contatosFiltrados]);

  function exportarExcel() {
    const linhas = contatosFiltrados.map((c) => ({
      Nome: c.nome,
      Telefone: c.telefone ?? '',
      Idade: c.idade ?? '',
      'Nível de interesse': c.nivel_interesse,
      'Local da abordagem': c.local_abordagem ?? '',
      'Data da abordagem': new Date(c.data_abordagem).toLocaleDateString('pt-BR'),
      'Etapa da jornada': c.etapa_jornada,
      Tags: c.tags.join(', '),
      Observações: c.observacoes ?? '',
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Funil de evangelização');
    XLSX.writeFile(livro, 'funil-evangelizacao.xlsx');
  }

  if (!usuario?.comunidade_id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-text-secondary">
        Seu usuário ainda não está vinculado a nenhuma comunidade.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={Filter}
        title="Funil de Evangelização"
        subtitle="Acompanhe a jornada de cada pessoa"
        actions={
          <Button variant="secondary" onClick={exportarExcel}>
            Exportar Excel
          </Button>
        }
      />

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-3 rounded-lg bg-bg-card p-4 shadow-card">
        <Input label="De" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Até" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        <Select
          label="Missionário"
          value={missionarioId}
          onChange={(e) => setMissionarioId(e.target.value)}
          options={[{ value: '', label: 'Todos' }, ...missionarios.map((m) => ({ value: m.id, label: m.nome }))]}
        />
        <div className="min-w-[160px] flex-1">
          <Input
            label="Local / região"
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Buscar por local"
          />
        </div>
      </div>

      {/* Funil */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        {carregandoDados ? (
          <p className="text-sm text-text-secondary">Carregando dados...</p>
        ) : (
          <div className="space-y-3">
            {funil.map((etapa) => (
              <div key={etapa.valor}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-text-primary">{etapa.label}</span>
                  <span className="text-text-secondary">{etapa.total}</span>
                </div>
                <div className="mt-1 h-3 w-full rounded-full bg-bg-page">
                  <div
                    className="h-3 rounded-full bg-primary"
                    style={{ width: `${(etapa.total / maiorTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Travados */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">
          Travados na abordagem há mais de 30 dias ({travados.length})
        </h2>
        {travados.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Nenhum contato travado"
            description="Todo mundo está avançando na jornada. Continue assim!"
          />
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {travados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <span className="text-text-primary">{c.nome}</span>
                  <span className="ml-2 text-text-secondary">
                    {c.local_abordagem ?? 'Local não informado'} ·{' '}
                    {new Date(c.data_abordagem).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Link
                  href={`/pastoral?nome=${encodeURIComponent(c.nome)}${
                    c.telefone ? `&telefone=${encodeURIComponent(c.telefone)}` : ''
                  }`}
                  className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary-xlight"
                >
                  <HeartHandshake size={13} /> Iniciar acompanhamento
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
