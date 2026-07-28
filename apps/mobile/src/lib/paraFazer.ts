import { supabase } from './supabase';
import { listarOvelhas } from './pastoral';
import type { Pessoa } from '../types/database';

// Lista "Para fazer hoje" — pessoal: as ovelhas do pastor logado e as pessoas
// sob responsabilidade dele com reunião/contato vencido, hoje ou nesta semana.

export type PrioridadeParaFazer = 'urgente' | 'hoje' | 'semana';

export interface ItemParaFazer {
  chave: string;
  tipo: 'ovelha' | 'pessoa';
  id: string;
  nome: string;
  descricao: string;
  prioridade: PrioridadeParaFazer;
  data: string;
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function emDias(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export async function listarParaFazer(comunidadeId: string, usuarioId: string): Promise<ItemParaFazer[]> {
  const hoje = hojeIso();
  const fimSemana = emDias(7);

  const [ovelhas, { data: pessoasData }] = await Promise.all([
    listarOvelhas(comunidadeId).catch(() => []),
    supabase.from('pessoas').select('*').eq('responsavel_id', usuarioId).eq('ativo', true),
  ]);

  const minhasOvelhas = ovelhas.filter((o) => o.pastor_id === usuarioId && o.ativo);
  const pessoas = (pessoasData as Pessoa[]) ?? [];
  const itens: ItemParaFazer[] = [];

  for (const o of minhasOvelhas) {
    if (!o.proxima_reuniao) continue;
    const base = { chave: `ov-${o.id}`, tipo: 'ovelha' as const, id: o.id, nome: o.nome };
    if (o.proxima_reuniao < hoje) {
      itens.push({ ...base, descricao: `Reunião vencida há ${diasEntre(o.proxima_reuniao, hoje)} dia(s)`, prioridade: 'urgente', data: o.proxima_reuniao });
    } else if (o.proxima_reuniao === hoje) {
      itens.push({ ...base, descricao: 'Reunião hoje', prioridade: 'hoje', data: o.proxima_reuniao });
    } else if (o.proxima_reuniao <= fimSemana) {
      itens.push({ ...base, descricao: 'Reunião esta semana', prioridade: 'semana', data: o.proxima_reuniao });
    }
  }

  for (const p of pessoas) {
    if (!p.proxima_visita) continue;
    const base = { chave: `pe-${p.id}`, tipo: 'pessoa' as const, id: p.id, nome: p.nome };
    if (p.proxima_visita < hoje) {
      itens.push({ ...base, descricao: `Contato vencido há ${diasEntre(p.proxima_visita, hoje)} dia(s)`, prioridade: 'urgente', data: p.proxima_visita });
    } else if (p.proxima_visita === hoje) {
      itens.push({ ...base, descricao: 'Contato hoje', prioridade: 'hoje', data: p.proxima_visita });
    } else if (p.proxima_visita <= fimSemana) {
      itens.push({ ...base, descricao: 'Contato esta semana', prioridade: 'semana', data: p.proxima_visita });
    }
  }

  return itens.sort((a, b) => a.data.localeCompare(b.data));
}
