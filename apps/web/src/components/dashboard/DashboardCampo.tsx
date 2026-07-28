'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, ChevronRight, Heart, IdCard, MessageCircle, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RegistrarEncontroPastoralModal } from '@/components/pastoral/RegistrarEncontroPastoralModal';
import { NovaInteracaoModal } from '@/components/pessoas/NovaInteracaoModal';
import { listarOvelhasDoPastor } from '@/lib/pastoral';
import { useTerminologia } from '@/lib/terminologia';
import type { PastoralOvelha, Pessoa, Usuario } from '@/types/database';

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function emDias(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function saudacaoDoDia() {
  const hora = new Date().getHours();
  if (hora < 12) return { texto: 'Bom dia', emoji: '☀️' };
  if (hora < 18) return { texto: 'Boa tarde', emoji: '🌤️' };
  return { texto: 'Boa noite', emoji: '🌙' };
}

// ---------------------------------------------------------------------------
// Itens da lista "Para fazer hoje"
// ---------------------------------------------------------------------------

type Prioridade = 'urgente' | 'hoje' | 'semana';

interface ItemParaFazer {
  chave: string;
  tipo: 'ovelha' | 'pessoa';
  id: string;
  nome: string;
  descricao: string;
  prioridade: Prioridade;
  data: string; // para ordenação
}

const COR_PRIORIDADE: Record<Prioridade, string> = {
  urgente: 'bg-danger',
  hoje: 'bg-warning',
  semana: 'bg-accent',
};

const LABEL_PRIORIDADE: Record<Prioridade, string> = {
  urgente: 'URGENTE',
  hoje: 'HOJE',
  semana: 'ESTA SEMANA',
};

const DOT_ESTADO: Record<string, string> = {
  crescendo: 'bg-accent',
  estavel: 'bg-primary',
  atencao: 'bg-warning',
  risco: 'bg-danger',
};

const LABEL_ESTADO: Record<string, string> = {
  crescendo: 'Crescendo',
  estavel: 'Estável',
  atencao: 'Em atenção',
  risco: 'Em risco',
};

function diaSemanaLabel(data: Date) {
  return ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][data.getDay()];
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function DashboardCampo({ usuario }: { usuario: Usuario }) {
  const terminologia = useTerminologia();
  const [ovelhas, setOvelhas] = useState<PastoralOvelha[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [ultimoEncontroPorOvelha, setUltimoEncontroPorOvelha] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);

  // ações inline
  const [ovelhaEncontro, setOvelhaEncontro] = useState<PastoralOvelha | null>(null);
  const [pessoaInteracao, setPessoaInteracao] = useState<Pessoa | null>(null);
  const [diaExpandido, setDiaExpandido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [minhasOvelhas, { data: minhasPessoas }] = await Promise.all([
        listarOvelhasDoPastor(usuario.id),
        supabase
          .from('pessoas')
          .select('*')
          .eq('responsavel_id', usuario.id)
          .eq('ativo', true)
          .order('nome', { ascending: true }),
      ]);
      setOvelhas(minhasOvelhas.filter((o) => o.ativo));
      setPessoas((minhasPessoas as Pessoa[]) ?? []);

      const ids = minhasOvelhas.map((o) => o.id);
      if (ids.length > 0) {
        const { data: encontros } = await supabase
          .from('pastoral_encontros')
          .select('ovelha_id, data')
          .in('ovelha_id', ids)
          .order('data', { ascending: false });
        const mapa: Record<string, string> = {};
        for (const e of (encontros as { ovelha_id: string; data: string }[]) ?? []) {
          if (!mapa[e.ovelha_id]) mapa[e.ovelha_id] = e.data;
        }
        setUltimoEncontroPorOvelha(mapa);
      } else {
        setUltimoEncontroPorOvelha({});
      }
    } finally {
      setCarregando(false);
    }
  }, [usuario.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const hoje = hojeIso();
  const fimSemana = emDias(7);

  // -------------------------------------------------------------------------
  // "Para fazer hoje" — lista priorizada
  // -------------------------------------------------------------------------
  const itensParaFazer = useMemo(() => {
    const itens: ItemParaFazer[] = [];

    for (const o of ovelhas) {
      if (!o.proxima_reuniao) continue;
      if (o.proxima_reuniao < hoje) {
        itens.push({
          chave: `ov-${o.id}`,
          tipo: 'ovelha',
          id: o.id,
          nome: o.nome,
          descricao: `Reunião pastoral vencida há ${diasEntre(o.proxima_reuniao, hoje)} dia(s)`,
          prioridade: 'urgente',
          data: o.proxima_reuniao,
        });
      } else if (o.proxima_reuniao === hoje) {
        itens.push({
          chave: `ov-${o.id}`,
          tipo: 'ovelha',
          id: o.id,
          nome: o.nome,
          descricao: 'Reunião agendada para hoje',
          prioridade: 'hoje',
          data: o.proxima_reuniao,
        });
      } else if (o.proxima_reuniao <= fimSemana) {
        itens.push({
          chave: `ov-${o.id}`,
          tipo: 'ovelha',
          id: o.id,
          nome: o.nome,
          descricao: `Reunião ${new Date(o.proxima_reuniao).toLocaleDateString('pt-BR', { weekday: 'long' })}`,
          prioridade: 'semana',
          data: o.proxima_reuniao,
        });
      }
    }

    for (const p of pessoas) {
      if (!p.proxima_visita) continue;
      if (p.proxima_visita < hoje) {
        itens.push({
          chave: `pe-${p.id}`,
          tipo: 'pessoa',
          id: p.id,
          nome: p.nome,
          descricao: `Próximo contato vencido há ${diasEntre(p.proxima_visita, hoje)} dia(s)`,
          prioridade: 'urgente',
          data: p.proxima_visita,
        });
      } else if (p.proxima_visita === hoje) {
        itens.push({
          chave: `pe-${p.id}`,
          tipo: 'pessoa',
          id: p.id,
          nome: p.nome,
          descricao: 'Próximo contato é hoje',
          prioridade: 'hoje',
          data: p.proxima_visita,
        });
      } else if (p.proxima_visita <= fimSemana) {
        itens.push({
          chave: `pe-${p.id}`,
          tipo: 'pessoa',
          id: p.id,
          nome: p.nome,
          descricao: `Contato programado ${new Date(p.proxima_visita).toLocaleDateString('pt-BR', { weekday: 'long' })}`,
          prioridade: 'semana',
          data: p.proxima_visita,
        });
      }
    }

    return itens.sort((a, b) => a.data.localeCompare(b.data));
  }, [ovelhas, pessoas, hoje, fimSemana]);

  const porPrioridade = useMemo(() => {
    const grupos: Record<Prioridade, ItemParaFazer[]> = { urgente: [], hoje: [], semana: [] };
    for (const item of itensParaFazer) grupos[item.prioridade].push(item);
    return grupos;
  }, [itensParaFazer]);

  const esperandoRetorno = porPrioridade.urgente.length;
  const compromissosSemana = porPrioridade.hoje.length + porPrioridade.semana.length;

  // -------------------------------------------------------------------------
  // "Minhas ovelhas" — vencidas primeiro, depois por próxima reunião
  // -------------------------------------------------------------------------
  const ovelhasOrdenadas = useMemo(() => {
    return [...ovelhas].sort((a, b) => {
      const aVencida = a.proxima_reuniao && a.proxima_reuniao < hoje ? 0 : 1;
      const bVencida = b.proxima_reuniao && b.proxima_reuniao < hoje ? 0 : 1;
      if (aVencida !== bVencida) return aVencida - bVencida;
      return (a.proxima_reuniao ?? '9999').localeCompare(b.proxima_reuniao ?? '9999');
    });
  }, [ovelhas, hoje]);

  const pessoasOrdenadas = useMemo(() => {
    return [...pessoas].sort((a, b) => (a.proxima_visita ?? '9999').localeCompare(b.proxima_visita ?? '9999'));
  }, [pessoas]);

  // -------------------------------------------------------------------------
  // Agenda da semana (seg a dom da semana atual)
  // -------------------------------------------------------------------------
  const diasDaSemana = useMemo(() => {
    const agora = new Date();
    const diaSemana = agora.getDay() === 0 ? 7 : agora.getDay(); // seg=1 ... dom=7
    const segunda = new Date(agora);
    segunda.setDate(agora.getDate() - (diaSemana - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(segunda);
      d.setDate(segunda.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const compromissos = [
        ...ovelhas
          .filter((o) => o.proxima_reuniao === iso)
          .map((o) => ({ nome: o.nome, tipo: 'Reunião pastoral', href: `/pastoral/${o.id}` })),
        ...pessoas
          .filter((p) => p.proxima_visita === iso)
          .map((p) => ({ nome: p.nome, tipo: 'Contato', href: `/pessoas/${p.id}` })),
      ];
      return { iso, label: diaSemanaLabel(d), numero: d.getDate(), ehHoje: iso === hoje, compromissos };
    });
  }, [ovelhas, pessoas, hoje]);

  const saudacao = saudacaoDoDia();
  const primeiroNome = usuario.nome.split(' ')[0];

  if (carregando) {
    return <p className="mt-6 text-sm text-text-secondary">Carregando seu dia...</p>;
  }

  return (
    <div>
      {/* Modais de ação inline */}
      {ovelhaEncontro && (
        <RegistrarEncontroPastoralModal
          open={!!ovelhaEncontro}
          onClose={() => setOvelhaEncontro(null)}
          ovelhaId={ovelhaEncontro.id}
          pastorId={usuario.id}
          onRegistrado={carregar}
        />
      )}
      {pessoaInteracao && (
        <NovaInteracaoModal
          open={!!pessoaInteracao}
          onClose={() => setPessoaInteracao(null)}
          pessoaId={pessoaInteracao.id}
          usuarioId={usuario.id}
          onRegistrada={carregar}
        />
      )}

      {/* Saudação contextual */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-xlight text-primary">
            <Sun size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {saudacao.texto}, {primeiroNome}! {saudacao.emoji}
            </h2>
            <p className="text-sm text-text-secondary">
              {compromissosSemana > 0 || esperandoRetorno > 0 ? (
                <>
                  Você tem <span className="font-semibold text-text-primary">{compromissosSemana}</span> compromisso(s)
                  esta semana
                  {esperandoRetorno > 0 && (
                    <>
                      {' '}
                      e <span className="font-semibold text-danger">{esperandoRetorno}</span> pessoa(s) esperando retorno
                    </>
                  )}
                  .
                </>
              ) : (
                'Nenhum compromisso pendente esta semana.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Para fazer hoje */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">Para fazer hoje</h2>
        {itensParaFazer.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">Tudo em dia! Nenhuma ação pendente. 🎉</p>
        ) : (
          <div className="mt-3 space-y-4">
            {(['urgente', 'hoje', 'semana'] as Prioridade[]).map((prioridade) => {
              const grupo = porPrioridade[prioridade];
              if (grupo.length === 0) return null;
              return (
                <div key={prioridade}>
                  <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                    {LABEL_PRIORIDADE[prioridade]}
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    {grupo.map((item) => (
                      <div
                        key={item.chave}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COR_PRIORIDADE[item.prioridade]}`} />
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                            {item.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">{item.nome}</p>
                            <p className="truncate text-xs text-text-secondary">{item.descricao}</p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {item.prioridade === 'urgente' && item.tipo === 'ovelha' ? (
                            <Button
                              size="sm"
                              onClick={() => setOvelhaEncontro(ovelhas.find((o) => o.id === item.id) ?? null)}
                            >
                              Registrar encontro
                            </Button>
                          ) : item.prioridade === 'urgente' && item.tipo === 'pessoa' ? (
                            <Button
                              size="sm"
                              onClick={() => setPessoaInteracao(pessoas.find((p) => p.id === item.id) ?? null)}
                            >
                              Registrar interação
                            </Button>
                          ) : (
                            <Link
                              href={item.tipo === 'ovelha' ? `/pastoral/${item.id}` : `/pessoas/${item.id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                            >
                              Ver perfil <ChevronRight size={14} />
                            </Link>
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Minhas ovelhas */}
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <Heart size={15} className="text-primary" /> Minhas {terminologia.nome_ovelha.toLowerCase()}s
            </h2>
            <Link href="/pastoral" className="text-xs font-medium text-primary hover:underline">
              Ver todas →
            </Link>
          </div>
          {ovelhasOrdenadas.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
              Você ainda não acompanha ninguém.{' '}
              <Link href="/pastoral" className="text-primary hover:underline">
                Começar agora
              </Link>
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {ovelhasOrdenadas.slice(0, 6).map((o) => {
                const ultimo = ultimoEncontroPorOvelha[o.id];
                const vencida = o.proxima_reuniao && o.proxima_reuniao < hoje;
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                        {o.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${DOT_ESTADO[o.estado_espiritual] ?? 'bg-text-secondary'}`} />
                          <p className="truncate text-sm font-semibold text-text-primary">{o.nome}</p>
                        </div>
                        <p className="truncate text-xs text-text-secondary">
                          {vencida
                            ? `Reunião vencida há ${diasEntre(o.proxima_reuniao!, hoje)} dia(s)`
                            : ultimo
                              ? `Último encontro: ${new Date(ultimo).toLocaleDateString('pt-BR')} (há ${diasEntre(ultimo, hoje)} dia(s))`
                              : 'Sem encontros ainda'}
                          {' · '}
                          {LABEL_ESTADO[o.estado_espiritual] ?? o.estado_espiritual}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setOvelhaEncontro(o)}
                      title="Registrar encontro"
                      className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary hover:bg-primary-xlight"
                    >
                      <CalendarPlus size={13} /> Encontro
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Minhas pessoas */}
        <div className="rounded-lg bg-bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <IdCard size={15} className="text-primary" /> Minhas pessoas
            </h2>
            <Link href="/pessoas" className="text-xs font-medium text-primary hover:underline">
              Ver todas →
            </Link>
          </div>
          {pessoasOrdenadas.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Nenhuma pessoa sob sua responsabilidade ainda.</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {pessoasOrdenadas.slice(0, 6).map((p) => {
                const vencida = p.proxima_visita && p.proxima_visita < hoje;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-xlight text-xs font-bold text-primary">
                        {p.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-text-primary">{p.nome}</p>
                          <Badge variant={p.nivel_interesse} showIcon={false} />
                        </div>
                        <p className="truncate text-xs text-text-secondary">
                          {vencida
                            ? `Próx. contato: vencido há ${diasEntre(p.proxima_visita!, hoje)} dia(s)`
                            : p.proxima_visita
                              ? `Próx. contato: ${new Date(p.proxima_visita).toLocaleDateString('pt-BR')}`
                              : 'Sem contato programado'}
                        </p>
                      </div>
                    </div>
                    {vencida ? (
                      <button
                        onClick={() => setPessoaInteracao(p)}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary hover:bg-primary-xlight"
                      >
                        <MessageCircle size={13} /> Contatar
                      </button>
                    ) : (
                      <Link
                        href={`/pessoas/${p.id}`}
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary hover:bg-primary-xlight"
                      >
                        Ver
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Agenda da semana */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">Agenda da semana</h2>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {diasDaSemana.map((dia) => (
            <button
              key={dia.iso}
              onClick={() => setDiaExpandido(diaExpandido === dia.iso ? null : dia.iso)}
              className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 transition-colors ${
                dia.ehHoje
                  ? 'border-primary bg-primary-xlight'
                  : diaExpandido === dia.iso
                    ? 'border-primary'
                    : 'border-border hover:bg-bg-page'
              }`}
            >
              <span className="text-[10px] font-semibold text-text-secondary">{dia.label}</span>
              <span className={`text-sm font-bold ${dia.ehHoje ? 'text-primary' : 'text-text-primary'}`}>
                {dia.numero}
              </span>
              <span className="flex h-2 items-center gap-0.5">
                {dia.compromissos.slice(0, 3).map((_, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
                ))}
              </span>
            </button>
          ))}
        </div>
        {diaExpandido && (
          <div className="mt-3 space-y-1.5">
            {(diasDaSemana.find((d) => d.iso === diaExpandido)?.compromissos ?? []).length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum compromisso neste dia.</p>
            ) : (
              diasDaSemana
                .find((d) => d.iso === diaExpandido)!
                .compromissos.map((c, i) => (
                  <Link
                    key={i}
                    href={c.href}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-bg-page"
                  >
                    <span className="font-semibold text-text-primary">{c.nome}</span>
                    <span className="text-xs text-text-secondary">{c.tipo}</span>
                  </Link>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
