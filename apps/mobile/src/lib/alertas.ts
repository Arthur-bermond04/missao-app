import { supabase } from './supabase';
import { buscarComunidade } from './comunidades';
import { detectarAusencias } from './frequencia';
import { ovelhaEmAtraso, type OvelhaResumo } from './monitoria';
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

/**
 * Métricas de encontro pastoral das ovelhas visíveis. Tenta a view de
 * monitoria (caminho da gestão e do supervisor) e completa com o cálculo
 * direto em pastoral_encontros para as ovelhas do próprio pastor, que não tem
 * acesso à view.
 */
async function resumoDeOvelhas(comunidadeId: string, ovelhas: PastoralOvelha[]): Promise<OvelhaResumo[]> {
  if (ovelhas.length === 0) return [];

  const { data: daView } = await supabase
    .from('pastoral_ovelhas_resumo')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true);

  const resumo = (daView as OvelhaResumo[]) ?? [];
  const cobertas = new Set(resumo.map((o) => o.id));
  const faltantes = ovelhas.filter((o) => !cobertas.has(o.id));
  if (faltantes.length === 0) return resumo;

  const { data: encontros } = await supabase
    .from('pastoral_encontros')
    .select('ovelha_id, data')
    .in('ovelha_id', faltantes.map((o) => o.id));

  const ultimoPorOvelha = new Map<string, string>();
  for (const e of (encontros as { ovelha_id: string; data: string }[]) ?? []) {
    const atual = ultimoPorOvelha.get(e.ovelha_id);
    if (!atual || e.data > atual) ultimoPorOvelha.set(e.ovelha_id, e.data);
  }

  const hoje = hojeIso();
  for (const o of faltantes) {
    const ultimo = ultimoPorOvelha.get(o.id) ?? null;
    resumo.push({
      ...o,
      total_encontros: 0,
      encontros_ultimo_mes: 0,
      ultimo_encontro: ultimo,
      dias_sem_encontro: ultimo ? diasEntre(ultimo, hoje) : null,
    } as OvelhaResumo);
  }

  return resumo;
}

/** Ovelhas com faltas seguidas em célula, missa e demais eventos registrados. */
async function ausenciasEmEventos(ovelhaIds: string[]) {
  if (ovelhaIds.length === 0) return [];

  const { data } = await supabase
    .from('pastoral_presencas')
    .select('ovelha_id, data, presente')
    .in('ovelha_id', ovelhaIds)
    .order('data', { ascending: false });

  return detectarAusencias(
    ((data as { ovelha_id: string; data: string; presente: boolean }[]) ?? []).map((p) => ({
      participanteId: p.ovelha_id,
      data: p.data,
      presente: p.presente,
    }))
  );
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

  // Ovelhas sem encontro pastoral há mais tempo do que a frequência combinada.
  // Diferente de "reunião vencida", que depende de alguém ter agendado a
  // próxima: aqui o gatilho é o silêncio em si.
  for (const o of await resumoDeOvelhas(comunidadeId, ovelhas)) {
    if (!ovelhaEmAtraso(o)) continue;
    if (o.proxima_reuniao && o.proxima_reuniao < hoje) continue;
    alertas.push({
      id: `ovelha-sem-encontro-${o.id}`,
      nivel: 'urgente',
      modulo: 'Pastoral',
      mensagem:
        o.dias_sem_encontro == null
          ? `${o.nome} — nenhum encontro registrado`
          : `${o.nome} — sem encontro há ${o.dias_sem_encontro} dias (combinado: ${o.frequencia_acompanhamento})`,
      detalhe: `pastor: ${nomeUsuario.get(o.pastor_id) ?? '—'}`,
    });
  }

  // Faltas seguidas em célula, missa e demais eventos acompanhados
  const ovelhaPorId = new Map(ovelhas.map((o) => [o.id, o]));
  for (const a of await ausenciasEmEventos(ovelhas.map((o) => o.id))) {
    const ovelha = ovelhaPorId.get(a.participanteId);
    if (!ovelha) continue;
    alertas.push({
      id: `ovelha-faltas-${a.participanteId}`,
      nivel: 'atencao',
      modulo: 'Pastoral',
      mensagem: `${ovelha.nome} — ${a.faltas} ausências seguidas nos encontros`,
      detalhe: `última em ${new Date(a.ultimaFalta).toLocaleDateString('pt-BR')}`,
    });
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
