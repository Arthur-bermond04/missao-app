import { supabase } from './supabase';
import { listarMinisterios } from './ministerios';
import { buscarComunidade } from './comunidades';
import { detectarAusencias, FALTAS_CONSECUTIVAS_ALERTA } from './frequencia';
import { ovelhaEmAtraso, type OvelhaResumo } from './monitoria';
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

// ---------------------------------------------------------------------------
// Fontes de ausência
// ---------------------------------------------------------------------------

/**
 * Métricas de encontro pastoral das ovelhas visíveis.
 *
 * Tenta a view de monitoria primeiro (é o caminho da gestão e do supervisor, e
 * já traz dias_sem_encontro pronto sem expor relato). Para as ovelhas que a
 * view não devolveu — o caso do pastor comum, que não tem acesso a ela — cai
 * para o cálculo direto em pastoral_encontros, que o RLS libera para as
 * ovelhas dele.
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
    .in(
      'ovelha_id',
      faltantes.map((o) => o.id)
    );

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

/** Quem acumulou faltas seguidas nos últimos encontros de cada ministério. */
async function ausenciasEmMinisterios(ministerioIds: string[]) {
  if (ministerioIds.length === 0) return [];

  const { data: encontros } = await supabase
    .from('ministerio_encontros')
    .select('id, ministerio_id, data')
    .in('ministerio_id', ministerioIds)
    .order('data', { ascending: false });

  const lista = (encontros as { id: string; ministerio_id: string; data: string }[]) ?? [];
  if (lista.length === 0) return [];

  // Só interessam os últimos encontros de cada ministério — faltas antigas já
  // foram resolvidas (ou não) e não deveriam reaparecer como alerta novo.
  const recentesPorMinisterio = new Map<string, typeof lista>();
  for (const e of lista) {
    const atual = recentesPorMinisterio.get(e.ministerio_id) ?? [];
    if (atual.length < FALTAS_CONSECUTIVAS_ALERTA) {
      atual.push(e);
      recentesPorMinisterio.set(e.ministerio_id, atual);
    }
  }

  const encontrosRecentes = [...recentesPorMinisterio.values()].flat();
  const dataDoEncontro = new Map(encontrosRecentes.map((e) => [e.id, e.data]));
  const ministerioDoEncontro = new Map(encontrosRecentes.map((e) => [e.id, e.ministerio_id]));

  const { data: presencas } = await supabase
    .from('ministerio_presencas')
    .select('encontro_id, usuario_id, pessoa_id, presente')
    .in(
      'encontro_id',
      encontrosRecentes.map((e) => e.id)
    );

  const porMinisterio = new Map<string, { participanteId: string; data: string; presente: boolean }[]>();
  for (const p of (presencas as { encontro_id: string; usuario_id: string | null; pessoa_id: string | null; presente: boolean }[]) ?? []) {
    const participanteId = p.usuario_id ?? p.pessoa_id;
    const data = dataDoEncontro.get(p.encontro_id);
    const ministerioId = ministerioDoEncontro.get(p.encontro_id);
    if (!participanteId || !data || !ministerioId) continue;
    const atual = porMinisterio.get(ministerioId) ?? [];
    atual.push({ participanteId, data, presente: p.presente });
    porMinisterio.set(ministerioId, atual);
  }

  return [...porMinisterio.entries()].flatMap(([ministerioId, registros]) =>
    detectarAusencias(registros).map((a) => ({ ...a, ministerioId }))
  );
}

/** Ovelhas com faltas seguidas em célula, missa e demais eventos registrados. */
async function ausenciasEmEventos(ovelhaIds: string[]) {
  if (ovelhaIds.length === 0) return [];

  const { data } = await supabase
    .from('pastoral_presencas')
    .select('ovelha_id, data, presente')
    .in('ovelha_id', ovelhaIds)
    .order('data', { ascending: false });

  const registros = ((data as { ovelha_id: string; data: string; presente: boolean }[]) ?? []).map((p) => ({
    participanteId: p.ovelha_id,
    data: p.data,
    presente: p.presente,
  }));

  return detectarAusencias(registros);
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
  const nomePessoa = new Map(pessoas.map((p) => [p.id, p.nome]));
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

  // Ovelhas sem encontro pastoral há mais tempo do que a frequência combinada.
  // Diferente de "reunião vencida", que depende de alguém ter agendado a
  // próxima: aqui o gatilho é o silêncio em si.
  for (const o of await resumoDeOvelhas(comunidadeId, ovelhas)) {
    if (!ovelhaEmAtraso(o)) continue;
    // Reunião vencida já cobre este caso com uma mensagem mais precisa.
    if (o.proxima_reuniao && o.proxima_reuniao < hoje) continue;

    const ehMinha = o.pastor_id === usuario.id;
    alertas.push({
      id: `ovelha-sem-encontro-${o.id}`,
      nivel: 'urgente',
      modulo: 'Pastoral',
      mensagem:
        o.dias_sem_encontro == null
          ? `${o.nome} — Nenhum encontro pastoral registrado até hoje`
          : `${o.nome} — Sem encontro pastoral há ${o.dias_sem_encontro} dias (combinado: ${o.frequencia_acompanhamento})`,
      detalhe: `pastor: ${nomeUsuario.get(o.pastor_id) ?? '—'}`,
      href: ehMinha ? `/pastoral/${o.id}` : '/pastoral/monitoria',
    });
  }

  // Faltas seguidas em ministério
  for (const a of await ausenciasEmMinisterios(ministerios.map((m) => m.id))) {
    const ministerio = ministerios.find((m) => m.id === a.ministerioId);
    alertas.push({
      id: `ministerio-faltas-${a.ministerioId}-${a.participanteId}`,
      nivel: 'atencao',
      modulo: 'Ministérios',
      mensagem: `${nomeUsuario.get(a.participanteId) ?? nomePessoa.get(a.participanteId) ?? 'Membro'} — ${a.faltas} faltas seguidas em ${ministerio?.nome ?? 'ministério'}`,
      detalhe: `última ausência em ${new Date(a.ultimaFalta).toLocaleDateString('pt-BR')}`,
      href: '/ministerios',
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
      mensagem: `${ovelha.nome} — ${a.faltas} ausências seguidas nos encontros da comunidade`,
      detalhe: `última ausência em ${new Date(a.ultimaFalta).toLocaleDateString('pt-BR')}`,
      href: ovelha.pastor_id === usuario.id ? `/pastoral/${ovelha.id}` : '/pastoral/monitoria',
    });
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
