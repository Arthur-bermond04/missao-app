'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { dataLocalIso, type EventoAgenda, type TipoEventoAgenda } from '@/lib/agenda';
import { CORES } from '@/lib/cores';

export type VisaoCalendario = 'mes' | 'semana' | 'dia';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Valor literal (e não classe): a cor entra num estilo inline e ganha alfa por concatenação.
export const COR_TIPO_EVENTO: Record<TipoEventoAgenda, string> = {
  ministerio: CORES.primary,
  pastoral: CORES.info,
  retiro: CORES.roxo,
  avulso: CORES.warning,
};

// ---------------------------------------------------------------------------
// Datas (sempre locais; nada de toISOString, que usa UTC)
// ---------------------------------------------------------------------------
function deIso(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}
function somarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function inicioDaSemana(d: Date): Date {
  return somarDias(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -d.getDay());
}

/** Primeiro e último dia exibidos pela visão (o mês inclui os dias vizinhos que completam as semanas). */
export function intervaloVisivel(visao: VisaoCalendario, ancora: Date): { de: string; ate: string } {
  if (visao === 'dia') {
    const iso = dataLocalIso(ancora);
    return { de: iso, ate: iso };
  }
  if (visao === 'semana') {
    const ini = inicioDaSemana(ancora);
    return { de: dataLocalIso(ini), ate: dataLocalIso(somarDias(ini, 6)) };
  }
  const primeiro = new Date(ancora.getFullYear(), ancora.getMonth(), 1);
  const ultimo = new Date(ancora.getFullYear(), ancora.getMonth() + 1, 0);
  const ini = inicioDaSemana(primeiro);
  const fim = somarDias(inicioDaSemana(ultimo), 6);
  return { de: dataLocalIso(ini), ate: dataLocalIso(fim) };
}

export function tituloDoPeriodo(visao: VisaoCalendario, ancora: Date): string {
  if (visao === 'mes') return ancora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  if (visao === 'dia') return ancora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const ini = inicioDaSemana(ancora);
  const fim = somarDias(ini, 6);
  const mesmoMes = ini.getMonth() === fim.getMonth();
  return mesmoMes
    ? `${ini.getDate()} – ${fim.getDate()} de ${fim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    : `${ini.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${fim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function navegar(visao: VisaoCalendario, ancora: Date, sentido: -1 | 1): Date {
  if (visao === 'mes') return new Date(ancora.getFullYear(), ancora.getMonth() + sentido, 1);
  return somarDias(ancora, sentido * (visao === 'semana' ? 7 : 1));
}

/** Agrupa por dia; evento de vários dias (retiro) aparece em cada dia do intervalo. */
function agruparPorDia(eventos: EventoAgenda[]): Map<string, EventoAgenda[]> {
  const mapa = new Map<string, EventoAgenda[]>();
  for (const e of eventos) {
    const ini = deIso(e.data);
    const fim = e.dataFim ? deIso(e.dataFim) : ini;
    for (let d = ini, i = 0; d <= fim && i < 62; d = somarDias(d, 1), i += 1) {
      const k = dataLocalIso(d);
      mapa.set(k, [...(mapa.get(k) ?? []), e]);
    }
  }
  for (const lista of mapa.values()) lista.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));
  return mapa;
}

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------
function Chip({ evento, onClick }: { evento: EventoAgenda; onClick: (e: EventoAgenda) => void }) {
  const cor = COR_TIPO_EVENTO[evento.tipo];
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        onClick(evento);
      }}
      title={evento.titulo}
      className="flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      style={{ backgroundColor: `${cor}1A`, color: cor }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
      {!!evento.hora && <span className="shrink-0 tabular-nums">{evento.hora}</span>}
      <span className="truncate">{evento.titulo}</span>
    </button>
  );
}

function NumeroDoDia({ d, hojeIso, esmaecido }: { d: Date; hojeIso: string; esmaecido?: boolean }) {
  const ehHoje = dataLocalIso(d) === hojeIso;
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums ${
        ehHoje ? 'bg-primary text-white' : esmaecido ? 'text-text-muted' : 'text-text-primary'
      }`}
    >
      {d.getDate()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------
export function CalendarioAgenda({
  visao,
  ancora,
  eventos,
  podeCriar,
  onMudarVisao,
  onNavegar,
  onHoje,
  onClicarDia,
  onClicarEvento,
  onAbrirDia,
}: {
  visao: VisaoCalendario;
  ancora: Date;
  eventos: EventoAgenda[];
  podeCriar: boolean;
  onMudarVisao: (v: VisaoCalendario) => void;
  onNavegar: (sentido: -1 | 1) => void;
  onHoje: () => void;
  /** Clique num dia vazio: abre o formulário de novo evento naquela data. */
  onClicarDia: (iso: string) => void;
  onClicarEvento: (e: EventoAgenda) => void;
  /** "+N mais" e cabeçalho de dia: leva para a visão do dia. */
  onAbrirDia: (iso: string) => void;
}) {
  const hojeIso = dataLocalIso();
  const porDia = useMemo(() => agruparPorDia(eventos), [eventos]);

  const dias = useMemo(() => {
    const { de, ate } = intervaloVisivel(visao, ancora);
    const lista: Date[] = [];
    for (let d = deIso(de); d <= deIso(ate); d = somarDias(d, 1)) lista.push(d);
    return lista;
  }, [visao, ancora]);

  const visaoBtn = (v: VisaoCalendario, rotulo: string) => (
    <button
      key={v}
      type="button"
      onClick={() => onMudarVisao(v)}
      aria-pressed={visao === v}
      className={`h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destaque/50 ${
        visao === v ? 'bg-destaque text-destaque-texto shadow-sm' : 'text-white/70 hover:text-white'
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div>
      {/* Barra de ferramentas: navegação, título e visão */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavegar(-1)}
            aria-label="Período anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-calendario-botao text-white shadow-sm transition-colors hover:bg-calendario-botao-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destaque/50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onNavegar(1)}
            aria-label="Próximo período"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-calendario-botao text-white shadow-sm transition-colors hover:bg-calendario-botao-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destaque/50"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <h2 className="inline-block text-base font-semibold text-text-primary first-letter:uppercase">{tituloDoPeriodo(visao, ancora)}</h2>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onHoje}
            className="h-9 rounded-lg bg-calendario-botao px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-calendario-botao-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destaque/50"
          >
            Hoje
          </button>
          <div className="flex items-center gap-0.5 rounded-lg bg-calendario-botao p-1">
            {visaoBtn('mes', 'Mês')}
            {visaoBtn('semana', 'Semana')}
            {visaoBtn('dia', 'Dia')}
          </div>
        </div>
      </div>

      {/* MÊS */}
      {visao === 'mes' && (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px] overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-calendario-cabecalho">
              {DIAS_SEMANA.map((n) => (
                <div key={n} className="px-3 py-2.5 text-center text-xs font-semibold text-text-primary">
                  {n}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {dias.map((d, i) => {
                const iso = dataLocalIso(d);
                const doMes = d.getMonth() === ancora.getMonth();
                const lista = porDia.get(iso) ?? [];
                const visiveis = lista.slice(0, 3);
                return (
                  <div
                    key={iso}
                    onClick={() => podeCriar && onClicarDia(iso)}
                    className={`group min-h-28 border-b border-border p-1.5 transition-colors ${
                      i % 7 === 6 ? '' : 'border-r'
                    } ${doMes ? 'bg-calendario-celula' : 'bg-calendario-celula-fora'} ${podeCriar ? 'cursor-pointer hover:bg-primary-xlight/60' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onAbrirDia(iso);
                        }}
                        aria-label={`Ver o dia ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`}
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <NumeroDoDia d={d} hojeIso={hojeIso} esmaecido={!doMes} />
                      </button>
                      {podeCriar && (
                        <Plus size={14} className="text-text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {visiveis.map((e) => (
                        <Chip key={`${e.tipo}-${e.id}`} evento={e} onClick={onClicarEvento} />
                      ))}
                      {lista.length > visiveis.length && (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onAbrirDia(iso);
                          }}
                          className="px-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary"
                        >
                          +{lista.length - visiveis.length} mais
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SEMANA */}
      {visao === 'semana' && (
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-xl border border-border-soft">
            {dias.map((d, i) => {
              const iso = dataLocalIso(d);
              const lista = porDia.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  onClick={() => podeCriar && onClicarDia(iso)}
                  className={`min-h-72 border-border p-2 ${i === 6 ? '' : 'border-r'} ${
                    iso === hojeIso ? 'bg-primary-xlight/50' : 'bg-calendario-celula'
                  } ${podeCriar ? 'cursor-pointer hover:bg-primary-xlight/40' : ''}`}
                >
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onAbrirDia(iso);
                    }}
                    className="flex w-full flex-col items-center gap-0.5 rounded-md pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{DIAS_SEMANA[d.getDay()]}</span>
                    <NumeroDoDia d={d} hojeIso={hojeIso} />
                  </button>
                  <div className="space-y-1">
                    {lista.map((e) => (
                      <Chip key={`${e.tipo}-${e.id}`} evento={e} onClick={onClicarEvento} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DIA */}
      {visao === 'dia' && (
        <div className="mt-4 rounded-xl border border-border-soft">
          {(() => {
            const iso = dataLocalIso(ancora);
            const lista = porDia.get(iso) ?? [];
            return (
              <div className="p-4">
                {lista.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-text-secondary">Nenhum evento neste dia.</p>
                    {podeCriar && (
                      <button
                        type="button"
                        onClick={() => onClicarDia(iso)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
                      >
                        <Plus size={14} /> Novo evento neste dia
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {lista.map((e) => {
                      const cor = COR_TIPO_EVENTO[e.tipo];
                      return (
                        <li key={`${e.tipo}-${e.id}`}>
                          <button
                            type="button"
                            onClick={() => onClicarEvento(e)}
                            className="flex w-full items-center gap-3 rounded-lg border border-border-soft px-3 py-2.5 text-left transition-colors hover:bg-bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
                            <span className="w-14 shrink-0 text-xs font-medium tabular-nums text-text-secondary">{e.hora ?? 'Dia todo'}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-text-primary">{e.titulo}</span>
                              {!!e.subtitulo && <span className="block truncate text-xs text-text-secondary">{e.subtitulo}</span>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
