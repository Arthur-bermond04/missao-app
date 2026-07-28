import { supabase } from './supabase';
import { listarMinisterios } from './ministerios';
import { buscarComunidade } from './comunidades';
import type { PastoralOvelha, Pessoa, Usuario } from '../types/database';

// ---------------------------------------------------------------------------
// Central de alertas — motor único usado pelo Dashboard Gestão, pela tela
// /alertas e pelo sino. Cada alerta tem um id estável para permitir
// "marcar como visto" (persistido em usuarios.preferencias_notificacao).
// ---------------------------------------------------------------------------

export type NivelAlertaCentral = 'urgente' | 'atencao' | 'informativo';

export type ModuloAlerta = 'Pastoral' | 'Pessoas' | 'Retiros' | 'Ministérios' | 'Financeiro' | 'Funil';

export interface AlertaCentral {
  id: string;
  nivel: NivelAlertaCentral;
  modulo: ModuloAlerta;
  mensagem: string;
  detalhe?: string;
  href: string;
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

export async function gerarAlertasCentral(comunidadeId: string, usuario: Usuario): Promise<AlertaCentral[]> {
  const hoje = hojeIso();
  const corte30 = diasAtras(30);
  const corte7 = diasAtras(7);
  const modoGestao = ['coordenador', 'admin'].includes(usuario.perfil);

  const [pessoasRes, ovelhasRes, ministerios, usuariosRes, retirosRes, comunidade] = await Promise.all([
    supabase.from('pessoas').select('*').eq('comunidade_id', comunidadeId).eq('ativo', true),
    supabase.from('pastoral_ovelhas').select('*').eq('comunidade_id', comunidadeId).eq('ativo', true),
    listarMinisterios(comunidadeId).catch(() => []),
    supabase.from('usuarios').select('id, nome').eq('comunidade_id', comunidadeId),
    supabase
      .from('retiros')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .eq('status', 'aberto')
      .gte('data_inicio', hoje),
    buscarComunidade(comunidadeId).catch(() => null),
  ]);

  const pessoas = (pessoasRes.data as Pessoa[]) ?? [];
  const ovelhas = (ovelhasRes.data as PastoralOvelha[]) ?? [];
  const nomeUsuario = new Map(((usuariosRes.data as { id: string; nome: string }[]) ?? []).map((u) => [u.id, u.nome]));
  const retiros = (retirosRes.data as { id: string; nome: string; vagas: number | null; data_inicio: string }[]) ?? [];

  const alertas: AlertaCentral[] = [];

  // ---------------- URGENTE ----------------

  // Pessoas sem contato há mais de 30 dias
  for (const p of pessoas) {
    const referencia = p.ultimo_contato ?? p.criado_em.slice(0, 10);
    if (referencia < corte30) {
      alertas.push({
        id: `pessoa-sem-contato-${p.id}`,
        nivel: 'urgente',
        modulo: 'Pessoas',
        mensagem: `${p.nome} — Sem contato há ${diasEntre(referencia, hoje)} dias`,
        detalhe: p.responsavel_id ? `responsável: ${nomeUsuario.get(p.responsavel_id) ?? '—'}` : undefined,
        href: `/pessoas/${p.id}`,
      });
    }
  }

  // Ovelhas em risco ou com reunião vencida. Para gestão, o link vai para a
  // monitoria (o coordenador não tem acesso ao perfil/relatos da ovelha).
  for (const o of ovelhas) {
    const ehMinha = o.pastor_id === usuario.id;
    const href = ehMinha ? `/pastoral/${o.id}` : '/pastoral/monitoria';
    const pastor = nomeUsuario.get(o.pastor_id) ?? '—';
    if (o.estado_espiritual === 'risco') {
      alertas.push({
        id: `ovelha-risco-${o.id}`,
        nivel: 'urgente',
        modulo: 'Pastoral',
        mensagem: `${o.nome} — Em estado de risco`,
        detalhe: `pastor: ${pastor}`,
        href,
      });
    } else if (o.proxima_reuniao && o.proxima_reuniao < hoje) {
      alertas.push({
        id: `ovelha-reuniao-vencida-${o.id}`,
        nivel: 'urgente',
        modulo: 'Pastoral',
        mensagem: `${o.nome} — Reunião pastoral vencida há ${diasEntre(o.proxima_reuniao, hoje)} dias`,
        detalhe: `pastor: ${pastor}`,
        href,
      });
    }
  }

  // Ministérios com frequência baixa
  for (const m of ministerios) {
    if (m.frequencia_media_3 != null && m.frequencia_media_3 < 50) {
      alertas.push({
        id: `ministerio-frequencia-${m.id}`,
        nivel: 'urgente',
        modulo: 'Ministérios',
        mensagem: `${m.nome} — Frequência de ${m.frequencia_media_3}% nos últimos 3 encontros`,
        href: '/ministerios',
      });
    }
  }

  // ---------------- ATENÇÃO ----------------

  // Retiros com poucas vagas
  if (retiros.length > 0) {
    const { data: inscricoes } = await supabase
      .from('inscricoes_retiro')
      .select('retiro_id')
      .in(
        'retiro_id',
        retiros.map((r) => r.id)
      );
    const contagem = new Map<string, number>();
    for (const i of (inscricoes as { retiro_id: string }[]) ?? []) {
      contagem.set(i.retiro_id, (contagem.get(i.retiro_id) ?? 0) + 1);
    }
    for (const r of retiros) {
      if (!r.vagas) continue;
      const restantes = r.vagas - (contagem.get(r.id) ?? 0);
      if (restantes >= 0 && restantes / r.vagas < 0.2) {
        const diasParaInicio = diasEntre(hoje, r.data_inicio);
        alertas.push({
          id: `retiro-vagas-${r.id}`,
          nivel: 'atencao',
          modulo: 'Retiros',
          mensagem: `${r.nome} — ${restantes} vaga(s) restante(s)`,
          detalhe: diasParaInicio > 0 ? `começa em ${diasParaInicio} dia(s)` : 'começa hoje',
          href: '/retiros',
        });
      }
    }
  }

  // Pessoas paradas no início do funil há mais de 30 dias
  for (const p of pessoas) {
    if (
      ['contato_inicial', 'interessado'].includes(p.etapa_jornada) &&
      p.atualizado_em.slice(0, 10) < corte30 &&
      // sem contato recente já vira alerta urgente — não duplicar
      (p.ultimo_contato ?? p.criado_em.slice(0, 10)) >= corte30
    ) {
      alertas.push({
        id: `pessoa-parada-funil-${p.id}`,
        nivel: 'atencao',
        modulo: 'Funil',
        mensagem: `${p.nome} — ${p.etapa_jornada === 'interessado' ? 'Interessado' : 'Contato inicial'} há mais de 30 dias sem avançar no funil`,
        href: `/pessoas/${p.id}`,
      });
    }
  }

  // Meta financeira (só gestão)
  if (modoGestao && comunidade?.meta_arrecadacao_mensal) {
    const inicioMes = `${hoje.slice(0, 7)}-01`;
    const { data: doMes } = await supabase
      .from('financeiro')
      .select('valor')
      .eq('comunidade_id', comunidadeId)
      .eq('tipo', 'receita')
      .gte('data', inicioMes);
    const receitaMes = ((doMes as { valor: number }[]) ?? []).reduce((s, f) => s + f.valor, 0);
    const pct = Math.round((receitaMes / comunidade.meta_arrecadacao_mensal) * 100);
    if (pct < 50) {
      alertas.push({
        id: `meta-financeira-${hoje.slice(0, 7)}`,
        nivel: 'atencao',
        modulo: 'Financeiro',
        mensagem: `Meta financeira — ${pct}% atingida (R$ ${receitaMes.toFixed(2)} de R$ ${comunidade.meta_arrecadacao_mensal.toFixed(2)})`,
        href: '/financeiro',
      });
    }
  }

  // ---------------- INFORMATIVO ----------------

  // Pessoas novas esta semana
  const novasSemana = pessoas.filter((p) => p.criado_em.slice(0, 10) >= corte7).length;
  if (novasSemana > 0) {
    alertas.push({
      id: `pessoas-novas-${corte7}`,
      nivel: 'informativo',
      modulo: 'Pessoas',
      mensagem: `${novasSemana} pessoa(s) nova(s) cadastrada(s) esta semana`,
      href: '/pessoas',
    });
  }

  // Avanços de etapa esta semana (gerados pela integração de mudança de etapa)
  const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));
  const { data: avancos } = await supabase
    .from('pessoa_interacoes')
    .select('pessoa_id, descricao, data')
    .eq('tipo', 'mudanca_etapa')
    .gte('data', corte7)
    .in('pessoa_id', pessoas.length > 0 ? pessoas.map((p) => p.id) : ['00000000-0000-0000-0000-000000000000']);
  for (const a of (avancos as { pessoa_id: string; descricao: string; data: string }[]) ?? []) {
    const pessoa = pessoaPorId.get(a.pessoa_id);
    if (!pessoa) continue;
    alertas.push({
      id: `avanco-etapa-${a.pessoa_id}-${a.data}`,
      nivel: 'informativo',
      modulo: 'Funil',
      mensagem: `${pessoa.nome} ${a.descricao.charAt(0).toLowerCase()}${a.descricao.slice(1)}`,
      href: `/pessoas/${a.pessoa_id}`,
    });
  }

  // Frutos registrados esta semana (só os visíveis pelo usuário, por RLS)
  const { count: frutosSemana } = await supabase
    .from('pastoral_frutos')
    .select('id', { count: 'exact', head: true })
    .gte('criado_em', new Date(Date.now() - 7 * 86400000).toISOString());
  if ((frutosSemana ?? 0) > 0) {
    alertas.push({
      id: `frutos-semana-${corte7}`,
      nivel: 'informativo',
      modulo: 'Pastoral',
      mensagem: `${frutosSemana} fruto(s) espiritual(is) registrado(s) esta semana`,
      href: '/pastoral',
    });
  }

  const ordem: Record<NivelAlertaCentral, number> = { urgente: 0, atencao: 1, informativo: 2 };
  return alertas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

// ---------------------------------------------------------------------------
// "Marcar como visto" — persiste os ids em usuarios.preferencias_notificacao
// ---------------------------------------------------------------------------

export async function listarAlertasVistos(usuarioId: string): Promise<Set<string>> {
  const { data } = await supabase.from('usuarios').select('preferencias_notificacao').eq('id', usuarioId).single();
  const prefs = (data as { preferencias_notificacao: Record<string, unknown> | null } | null)?.preferencias_notificacao;
  const vistos = (prefs as { alertas_vistos?: string[] } | null)?.alertas_vistos;
  return new Set(Array.isArray(vistos) ? vistos : []);
}

export async function marcarAlertaVisto(usuarioId: string, alertaId: string) {
  const vistos = await listarAlertasVistos(usuarioId);
  vistos.add(alertaId);
  // mantém a lista limitada — ids antigos deixam de existir naturalmente
  const lista = Array.from(vistos).slice(-200);
  const { data } = await supabase.from('usuarios').select('preferencias_notificacao').eq('id', usuarioId).single();
  const prefs = ((data as { preferencias_notificacao: Record<string, unknown> | null } | null)?.preferencias_notificacao ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from('usuarios')
    .update({ preferencias_notificacao: { ...prefs, alertas_vistos: lista } })
    .eq('id', usuarioId);
  if (error) throw error;
}
