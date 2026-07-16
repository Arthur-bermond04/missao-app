'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useSession } from '../../lib/useSession';
import { supabase } from '../../lib/supabase';
import { ETAPAS_FUNIL, type Contato, type Usuario } from '../../types/database';

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export default function FunilPage() {
  const { session, usuario, carregando, sair } = useSession();
  const router = useRouter();

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [missionarios, setMissionarios] = useState<Usuario[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [missionarioId, setMissionarioId] = useState('');
  const [local, setLocal] = useState('');

  useEffect(() => {
    if (!carregando && !session) router.replace('/login');
  }, [carregando, session, router]);

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

  if (carregando || !session) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">Carregando...</div>;
  }

  if (!usuario?.comunidade_id) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-zinc-500">
        Seu usuário ainda não está vinculado a nenhuma comunidade.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-primary-light] px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[--color-primary]">Funil de evangelização</h1>
            <p className="text-sm text-zinc-500">Olá, {usuario.nome}</p>
          </div>
          <button
            onClick={() => sair().then(() => router.replace('/login'))}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600"
          >
            Sair
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-zinc-500">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500">Missionário</label>
            <select
              value={missionarioId}
              onChange={(e) => setMissionarioId(e.target.value)}
              className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {missionarios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-zinc-500">Local / região</label>
            <input
              type="text"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Buscar por local"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={exportarExcel}
              className="rounded-lg bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Funil */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          {carregandoDados ? (
            <p className="text-sm text-zinc-500">Carregando dados...</p>
          ) : (
            <div className="space-y-3">
              {funil.map((etapa) => (
                <div key={etapa.valor}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-zinc-700">{etapa.label}</span>
                    <span className="text-zinc-500">{etapa.total}</span>
                  </div>
                  <div className="mt-1 h-3 w-full rounded-full bg-zinc-100">
                    <div
                      className="h-3 rounded-full bg-[--color-primary]"
                      style={{ width: `${(etapa.total / maiorTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Travados */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-700">
            Travados na abordagem há mais de 30 dias ({travados.length})
          </h2>
          {travados.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Nenhum contato travado. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {travados.map((c) => (
                <li key={c.id} className="flex justify-between py-2 text-sm">
                  <span className="text-zinc-700">{c.nome}</span>
                  <span className="text-zinc-400">
                    {c.local_abordagem ?? 'Local não informado'} ·{' '}
                    {new Date(c.data_abordagem).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
