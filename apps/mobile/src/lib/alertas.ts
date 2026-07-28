import { supabase } from './supabase';
import { buscarComunidade } from './comunidades';
import type { PastoralOvelha, Pessoa, Usuario } from '../types/database';

export type NivelAlerta = 'urgente' | 'atencao' | 'informativo';
export type ModuloAlerta = 'Pastoral' | 'Pessoas' | 'Retiros' | 'Financeiro' | 'Funil';

export interface AlertaCentral {
  id: string;
  nivel: NivelAlerta;
  modulo: ModuloAlerta;
  mensagem: string;
  detalhe?: string;
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}
function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function diasEntre(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// Versão mobile do motor de alertas — cobre os sinais principais. A frequência
// de ministério (que no web depende de um cálculo à parte) fica de fora aqui.
export async function gerarAlertas(comunidadeId: string, usuario: Usuario): Promise<AlertaCentral[]> {
  const hoje = hojeIso();
  const corte30 = diasAtras(30);
  const corte7 = diasAtras(7);
  const modoGestao = ['coordenador', 'admin'].includes(usuario.perfil);

  const [pessoasRes, ovelhasRes, usuariosRes, retirosRes, comunidade] = await Promise.all([
    supabase.from('pessoas').select('*').eq('comunidade_id', comunidadeId).eq('ativo', true),
    supabase.from('pastoral_ovelhas').select('*').eq('comunidade_id', comunidadeId).eq('ativo', true),
    supabase.from('usuarios').select('id, nome').eq('comunidade_id', comunidadeId),
    supabase.from('retiros').select('*').eq('comunidade_id', comunidadeId).eq('status', 'aberto').gte('data_inicio', hoje),
    buscarComunidade(comunidadeId).catch(() => null),
  ]);

  const pessoas = (pessoasRes.data as Pessoa[]) ?? [];
  const ovelhas = (ovelhasRes.data as PastoralOvelha[]) ?? [];
  const nomeUsuario = new Map(((usuariosRes.data as { id: string; nome: string }[]) ?? []).map((u) => [u.id, u.nome]));
  const retiros = (retirosRes.data as { id: string; nome: string; vagas: number | null }[]) ?? [];

  const alertas: AlertaCentral[] = [];

  // Pessoas sem contato +30d
  for (const p of pessoas) {
    const ref = p.ultimo_contato ?? p.criado_em.slice(0, 10);
    if (ref < corte30) {
      alertas.push({
        id: `pessoa-sem-contato-${p.id}`,
        nivel: 'urgente',
        modulo: 'Pessoas',
        mensagem: `${p.nome} — sem contato há ${diasEntre(ref, hoje)} dias`,
        detalhe: p.responsavel_id ? `responsável: ${nomeUsuario.get(p.responsavel_id) ?? '—'}` : undefined,
      });
    }
  }

  // Ovelhas em risco / reunião vencida
  for (const o of ovelhas) {
    const pastor = nomeUsuario.get(o.pastor_id) ?? '—';
    if (o.estado_espiritual === 'risco') {
      alertas.push({ id: `ovelha-risco-${o.id}`, nivel: 'urgente', modulo: 'Pastoral', mensagem: `${o.nome} — em risco`, detalhe: `pastor: ${pastor}` });
    } else if (o.proxima_reuniao && o.proxima_reuniao < hoje) {
      alertas.push({ id: `ovelha-atraso-${o.id}`, nivel: 'urgente', modulo: 'Pastoral', mensagem: `${o.nome} — reunião vencida há ${diasEntre(o.proxima_reuniao, hoje)} dias`, detalhe: `pastor: ${pastor}` });
    }
  }

  // Retiros com poucas vagas
  if (retiros.length > 0) {
    const { data: insc } = await supabase.from('inscricoes_retiro').select('retiro_id').in('retiro_id', retiros.map((r) => r.id));
    const cont = new Map<string, number>();
    for (const i of (insc as { retiro_id: string }[]) ?? []) cont.set(i.retiro_id, (cont.get(i.retiro_id) ?? 0) + 1);
    for (const r of retiros) {
      if (!r.vagas) continue;
      const restantes = r.vagas - (cont.get(r.id) ?? 0);
      if (restantes >= 0 && restantes / r.vagas < 0.2) {
        alertas.push({ id: `retiro-vagas-${r.id}`, nivel: 'atencao', modulo: 'Retiros', mensagem: `${r.nome} — ${restantes} vaga(s) restante(s)` });
      }
    }
  }

  // Meta financeira (só gestão)
  if (modoGestao && comunidade?.meta_arrecadacao_mensal) {
    const inicioMes = `${hoje.slice(0, 7)}-01`;
    const { data: doMes } = await supabase.from('financeiro').select('valor').eq('comunidade_id', comunidadeId).eq('tipo', 'receita').gte('data', inicioMes);
    const receita = ((doMes as { valor: number }[]) ?? []).reduce((s, f) => s + f.valor, 0);
    const pct = Math.round((receita / comunidade.meta_arrecadacao_mensal) * 100);
    if (pct < 50) {
      alertas.push({ id: `meta-${hoje.slice(0, 7)}`, nivel: 'atencao', modulo: 'Financeiro', mensagem: `Meta financeira — ${pct}% atingida` });
    }
  }

  // Pessoas novas na semana
  const novas = pessoas.filter((p) => p.criado_em.slice(0, 10) >= corte7).length;
  if (novas > 0) {
    alertas.push({ id: `pessoas-novas-${corte7}`, nivel: 'informativo', modulo: 'Pessoas', mensagem: `${novas} pessoa(s) nova(s) esta semana` });
  }

  const ordem: Record<NivelAlerta, number> = { urgente: 0, atencao: 1, informativo: 2 };
  return alertas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}
