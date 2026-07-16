'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { supabase } from '../../lib/supabase';
import { PainelHeader } from '../../components/PainelHeader';
import { ETAPAS_FUNIL, type Contato, type Financeiro, type Retiro, type Usuario } from '../../types/database';

function inicioMes(offsetMeses = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMeses, 1);
  return d.toISOString().slice(0, 10);
}

function mesLabel(dataIso: string) {
  const [ano, mes] = dataIso.split('-');
  return `${mes}/${ano}`;
}

export default function DashboardPage() {
  const { session, usuario, carregando } = useSession();
  const router = useRouter();

  const [membros, setMembros] = useState<Usuario[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [celulasAtivas, setCelulasAtivas] = useState(0);
  const [proximoRetiro, setProximoRetiro] = useState<Retiro | null>(null);
  const [inscritosProximoRetiro, setInscritosProximoRetiro] = useState(0);
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    if (!carregando && !session) router.replace('/login');
  }, [carregando, session, router]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    const comunidadeId = usuario.comunidade_id;
    setCarregandoDados(true);

    Promise.all([
      supabase.from('usuarios').select('*').eq('comunidade_id', comunidadeId),
      supabase.from('contatos').select('*').eq('comunidade_id', comunidadeId),
      supabase
        .from('celulas')
        .select('id', { count: 'exact', head: true })
        .eq('comunidade_id', comunidadeId)
        .eq('ativa', true),
      supabase
        .from('retiros')
        .select('*')
        .eq('comunidade_id', comunidadeId)
        .gte('data_inicio', new Date().toISOString().slice(0, 10))
        .order('data_inicio', { ascending: true })
        .limit(1),
      supabase.from('financeiro').select('*').eq('comunidade_id', comunidadeId),
    ]).then(async ([usuariosRes, contatosRes, celulasRes, retirosRes, financeiroRes]) => {
      setMembros((usuariosRes.data as Usuario[]) ?? []);
      setContatos((contatosRes.data as Contato[]) ?? []);
      setCelulasAtivas(celulasRes.count ?? 0);
      setFinanceiro((financeiroRes.data as Financeiro[]) ?? []);

      const retiro = (retirosRes.data as Retiro[])?.[0] ?? null;
      setProximoRetiro(retiro);
      if (retiro) {
        const { count } = await supabase
          .from('inscricoes_retiro')
          .select('id', { count: 'exact', head: true })
          .eq('retiro_id', retiro.id);
        setInscritosProximoRetiro(count ?? 0);
      }
      setCarregandoDados(false);
    });
  }, [usuario?.comunidade_id]);

  const membrosAtivos = membros.filter((m) => m.ativo).length;

  const arrecadacaoMes = useMemo(() => {
    const inicio = inicioMes(0);
    return financeiro
      .filter((f) => f.tipo === 'receita' && f.data >= inicio)
      .reduce((soma, f) => soma + f.valor, 0);
  }, [financeiro]);

  const funilDoMes = useMemo(() => {
    const inicio = inicioMes(0);
    const contatosDoMes = contatos.filter((c) => c.data_abordagem >= inicio);
    return ETAPAS_FUNIL.map((etapa, index) => {
      const total = contatosDoMes.filter((c) => {
        const indiceContato = ETAPAS_FUNIL.findIndex((e) => e.valor === c.etapa_jornada);
        return indiceContato >= index;
      }).length;
      return { ...etapa, total };
    });
  }, [contatos]);

  const evolucaoMembros = useMemo(() => {
    const meses = Array.from({ length: 6 }, (_, i) => inicioMes(-(5 - i)).slice(0, 7));
    return meses.map((mesChave) => ({
      mes: mesLabel(`${mesChave}-01`),
      total: membros.filter((m) => m.criado_em.slice(0, 7) <= mesChave).length,
    }));
  }, [membros]);

  const receitasDespesas3Meses = useMemo(() => {
    const meses = Array.from({ length: 3 }, (_, i) => inicioMes(-(2 - i)).slice(0, 7));
    return meses.map((mesChave) => {
      const doMes = financeiro.filter((f) => f.data.slice(0, 7) === mesChave);
      return {
        mes: mesLabel(`${mesChave}-01`),
        receitas: doMes.filter((f) => f.tipo === 'receita').reduce((s, f) => s + f.valor, 0),
        despesas: doMes.filter((f) => f.tipo === 'despesa').reduce((s, f) => s + f.valor, 0),
      };
    });
  }, [financeiro]);

  const maiorFunil = funilDoMes[0]?.total || 1;
  const maiorMembros = Math.max(1, ...evolucaoMembros.map((m) => m.total));
  const maiorReceitaDespesa = Math.max(1, ...receitasDespesas3Meses.flatMap((m) => [m.receitas, m.despesas]));

  if (carregando || !session) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-[--color-primary-light] px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <PainelHeader titulo="Dashboard" nomeUsuario={usuario?.nome} />

        {carregandoDados ? (
          <p className="mt-6 text-sm text-zinc-500">Carregando dados...</p>
        ) : (
          <>
            {/* Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
              <Card titulo="Membros ativos" valor={membrosAtivos} />
              <Card titulo="Contatos cadastrados" valor={contatos.length} />
              <Card titulo="Células ativas" valor={celulasAtivas} />
              <Card
                titulo="Inscritos no próximo retiro"
                valor={proximoRetiro ? inscritosProximoRetiro : '—'}
                subtitulo={proximoRetiro?.nome}
              />
              <Card titulo="Arrecadação do mês" valor={`R$ ${arrecadacaoMes.toFixed(2)}`} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Funil do mês */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-zinc-700">Funil do mês</h2>
                <div className="mt-3 space-y-2">
                  {funilDoMes.map((e) => (
                    <div key={e.valor}>
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>{e.label}</span>
                        <span>{e.total}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full bg-[--color-primary]"
                          style={{ width: `${(e.total / maiorFunil) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evolução de membros */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-zinc-700">Evolução de membros (6 meses)</h2>
                <div className="mt-3 flex items-end gap-2" style={{ height: 120 }}>
                  {evolucaoMembros.map((m) => (
                    <div key={m.mes} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-md bg-[--color-primary]"
                        style={{ height: `${(m.total / maiorMembros) * 100}%` }}
                      />
                      <span className="text-[10px] text-zinc-400">{m.mes}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receitas x despesas */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-zinc-700">Receitas x despesas (3 meses)</h2>
                <div className="mt-3 space-y-3">
                  {receitasDespesas3Meses.map((m) => (
                    <div key={m.mes}>
                      <p className="text-xs font-semibold text-zinc-500">{m.mes}</p>
                      <div className="mt-1 h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full bg-[--color-success]"
                          style={{ width: `${(m.receitas / maiorReceitaDespesa) * 100}%` }}
                        />
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full bg-red-400"
                          style={{ width: `${(m.despesas / maiorReceitaDespesa) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ titulo, valor, subtitulo }: { titulo: string; valor: string | number; subtitulo?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-zinc-500">{titulo}</p>
      <p className="mt-1 text-2xl font-extrabold text-[--color-primary]">{valor}</p>
      {!!subtitulo && <p className="mt-0.5 text-xs text-zinc-400">{subtitulo}</p>}
    </div>
  );
}
