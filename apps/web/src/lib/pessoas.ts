import { supabase } from './supabase';
import type {
  Contato,
  EtapaJornada,
  EtapaJornadaPessoa,
  InscricaoRetiro,
  NivelInteresse,
  OrigemPessoa,
  Pessoa,
  PessoaInteracao,
  PessoaRetiro,
  TipoInteracao,
  CanalInteracao,
} from '../types/database';

// RLS já restringe a listagem às pessoas cadastradas/atribuídas ao usuário
// logado (ou todas, se admin/coordenador), então não é preciso filtrar por
// cadastrado_por manualmente aqui.

export interface FiltrosPessoas {
  busca?: string;
  etapa?: EtapaJornadaPessoa | '';
  interesse?: NivelInteresse | '';
  origem?: OrigemPessoa | '';
  proximoContato?: 'vencido' | 'semana' | 'mes' | '';
}

export async function listarPessoas(comunidadeId: string): Promise<Pessoa[]> {
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true);
  if (error) throw error;
  return (data as Pessoa[]) ?? [];
}

// Aplica os filtros da tela (client-side, já que a lista de uma comunidade
// tende a ser pequena o suficiente para isso — evita N idas ao Supabase).
export function filtrarPessoas(pessoas: Pessoa[], filtros: FiltrosPessoas): Pessoa[] {
  const hoje = new Date().toISOString().slice(0, 10);
  const em7 = new Date();
  em7.setDate(em7.getDate() + 7);
  const em7Iso = em7.toISOString().slice(0, 10);
  const fimMes = new Date();
  fimMes.setMonth(fimMes.getMonth() + 1, 0);
  const fimMesIso = fimMes.toISOString().slice(0, 10);

  return pessoas.filter((p) => {
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      const bateNome = p.nome.toLowerCase().includes(termo);
      const bateTelefone = (p.telefone ?? '').includes(termo) || (p.whatsapp ?? '').includes(termo);
      if (!bateNome && !bateTelefone) return false;
    }
    if (filtros.etapa && p.etapa_jornada !== filtros.etapa) return false;
    if (filtros.interesse && p.nivel_interesse !== filtros.interesse) return false;
    if (filtros.origem && p.origem !== filtros.origem) return false;
    if (filtros.proximoContato) {
      if (!p.proxima_visita) return false;
      if (filtros.proximoContato === 'vencido' && p.proxima_visita >= hoje) return false;
      if (filtros.proximoContato === 'semana' && (p.proxima_visita < hoje || p.proxima_visita > em7Iso)) return false;
      if (filtros.proximoContato === 'mes' && (p.proxima_visita < hoje || p.proxima_visita > fimMesIso)) return false;
    }
    return true;
  });
}

// Ordena por urgência: próxima visita vencida primeiro, depois mais próxima,
// depois quem não tem data marcada (por último).
export function ordenarPorUrgencia(pessoas: Pessoa[]): Pessoa[] {
  return [...pessoas].sort((a, b) => {
    if (!a.proxima_visita && !b.proxima_visita) return 0;
    if (!a.proxima_visita) return 1;
    if (!b.proxima_visita) return -1;
    return a.proxima_visita.localeCompare(b.proxima_visita);
  });
}

export function proximoContatoVencido(pessoa: Pessoa): boolean {
  if (!pessoa.proxima_visita) return false;
  return pessoa.proxima_visita < new Date().toISOString().slice(0, 10);
}

export async function buscarPessoa(id: string): Promise<Pessoa | null> {
  const { data, error } = await supabase.from('pessoas').select('*').eq('id', id).single();
  if (error) return null;
  return data as Pessoa;
}

// Busca leve para Comboboxes (pastoral, retiros, ministérios) — respeita o
// mesmo RLS de "meus cadastros" automaticamente.
export async function buscarPessoasParaCombobox(comunidadeId: string): Promise<Pessoa[]> {
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data as Pessoa[]) ?? [];
}

export interface NovaPessoaDados {
  comunidade_id: string;
  cadastrado_por: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  data_nascimento?: string;
  idade?: number;
  sexo?: string;
  cidade?: string;
  bairro?: string;
  situacao_fe?: string;
  origem?: OrigemPessoa;
  local_primeiro_contato?: string;
  data_primeiro_contato?: string;
  etapa_jornada?: EtapaJornadaPessoa;
  nivel_interesse?: NivelInteresse;
  frequencia_acompanhamento?: string;
  proxima_visita?: string;
  responsavel_id?: string;
  objetivo_atual?: string;
  observacoes?: string;
  tags?: string[];
}

export async function criarPessoa(dados: NovaPessoaDados): Promise<Pessoa> {
  const { data, error } = await supabase
    .from('pessoas')
    .insert({
      comunidade_id: dados.comunidade_id,
      cadastrado_por: dados.cadastrado_por,
      nome: dados.nome,
      telefone: dados.telefone || null,
      whatsapp: dados.whatsapp || dados.telefone || null,
      email: dados.email || null,
      data_nascimento: dados.data_nascimento || null,
      idade: dados.idade ?? null,
      sexo: dados.sexo || null,
      cidade: dados.cidade || null,
      bairro: dados.bairro || null,
      situacao_fe: dados.situacao_fe || 'nao_informado',
      origem: dados.origem || 'evangelizacao',
      local_primeiro_contato: dados.local_primeiro_contato || null,
      data_primeiro_contato: dados.data_primeiro_contato || new Date().toISOString().slice(0, 10),
      etapa_jornada: dados.etapa_jornada || 'contato_inicial',
      nivel_interesse: dados.nivel_interesse || 'morno',
      frequencia_acompanhamento: dados.frequencia_acompanhamento || 'mensal',
      proxima_visita: dados.proxima_visita || null,
      responsavel_id: dados.responsavel_id || dados.cadastrado_por,
      objetivo_atual: dados.objetivo_atual || null,
      observacoes: dados.observacoes || null,
      tags: dados.tags ?? [],
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Pessoa;
}

export async function atualizarPessoa(id: string, campos: Partial<Pessoa>) {
  const { error } = await supabase
    .from('pessoas')
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function arquivarPessoa(id: string) {
  await atualizarPessoa(id, { ativo: false });
}

// ---------------------------------------------------------------------------
// Interações
// ---------------------------------------------------------------------------

export async function listarInteracoes(pessoaId: string): Promise<PessoaInteracao[]> {
  const { data, error } = await supabase
    .from('pessoa_interacoes')
    .select('*')
    .eq('pessoa_id', pessoaId)
    .order('data', { ascending: false });
  if (error) throw error;
  return (data as PessoaInteracao[]) ?? [];
}

export async function criarInteracao(dados: {
  pessoa_id: string;
  usuario_id: string;
  data: string;
  tipo: TipoInteracao;
  canal?: CanalInteracao;
  descricao: string;
  proximo_passo?: string;
}): Promise<PessoaInteracao> {
  const { data, error } = await supabase
    .from('pessoa_interacoes')
    .insert({
      pessoa_id: dados.pessoa_id,
      usuario_id: dados.usuario_id,
      data: dados.data,
      tipo: dados.tipo,
      canal: dados.canal || 'presencial',
      descricao: dados.descricao,
      proximo_passo: dados.proximo_passo || null,
    })
    .select('*')
    .single();
  if (error) throw error;

  // atualiza o "último contato" da pessoa automaticamente
  await atualizarPessoa(dados.pessoa_id, { ultimo_contato: dados.data });
  return data as PessoaInteracao;
}

// ---------------------------------------------------------------------------
// Retiros da pessoa
// ---------------------------------------------------------------------------

export async function listarRetirosDaPessoa(pessoaId: string): Promise<PessoaRetiro[]> {
  const { data, error } = await supabase
    .from('pessoa_retiros')
    .select('*')
    .eq('pessoa_id', pessoaId)
    .order('data_retiro', { ascending: false });
  if (error) throw error;
  return (data as PessoaRetiro[]) ?? [];
}

export async function vincularRetiro(dados: {
  pessoa_id: string;
  retiro_id?: string;
  nome_retiro: string;
  data_retiro: string;
  participou?: boolean;
  observacao?: string;
}): Promise<PessoaRetiro> {
  const { data, error } = await supabase
    .from('pessoa_retiros')
    .insert({
      pessoa_id: dados.pessoa_id,
      retiro_id: dados.retiro_id || null,
      nome_retiro: dados.nome_retiro,
      data_retiro: dados.data_retiro,
      participou: dados.participou ?? true,
      observacao: dados.observacao || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PessoaRetiro;
}

// ---------------------------------------------------------------------------
// Resumo para o dashboard
// ---------------------------------------------------------------------------

export interface ResumoPessoas {
  total: number;
  vencidas: number;
  novasSemana: number;
}

// ---------------------------------------------------------------------------
// Promoção de contato do funil para o cadastro central
// ---------------------------------------------------------------------------

const ETAPA_FUNIL_PARA_JORNADA: Record<EtapaJornada, EtapaJornadaPessoa> = {
  abordagem: 'contato_inicial',
  celula: 'participando',
  retiro: 'participando',
  cv: 'cv',
  cal: 'cal',
};

export async function promoverContatoParaPessoa(contato: Contato, cadastradoPor: string): Promise<Pessoa> {
  const pessoa = await criarPessoa({
    comunidade_id: contato.comunidade_id,
    cadastrado_por: cadastradoPor,
    nome: contato.nome,
    telefone: contato.telefone ?? undefined,
    idade: contato.idade ?? undefined,
    nivel_interesse: contato.nivel_interesse,
    origem: 'evangelizacao',
    local_primeiro_contato: contato.local_abordagem ?? undefined,
    data_primeiro_contato: contato.data_abordagem.slice(0, 10),
    etapa_jornada: ETAPA_FUNIL_PARA_JORNADA[contato.etapa_jornada],
    responsavel_id: contato.missionario_id ?? cadastradoPor,
    observacoes: contato.observacoes ?? undefined,
    tags: contato.tags,
  });
  const { error } = await supabase.from('contatos').update({ pessoa_id: pessoa.id }).eq('id', contato.id);
  if (error) throw error;
  return pessoa;
}

export async function promoverInscricaoParaPessoa(
  inscricao: InscricaoRetiro,
  comunidadeId: string,
  cadastradoPor: string,
  retiro?: { nome: string; data_inicio: string }
): Promise<Pessoa> {
  const pessoa = await criarPessoa({
    comunidade_id: comunidadeId,
    cadastrado_por: cadastradoPor,
    nome: inscricao.nome ?? 'Sem nome',
    telefone: inscricao.telefone ?? undefined,
    origem: 'retiro',
    local_primeiro_contato: retiro?.nome,
  });
  const { error } = await supabase.from('inscricoes_retiro').update({ pessoa_id: pessoa.id }).eq('id', inscricao.id);
  if (error) throw error;
  if (retiro) {
    await vincularRetiro({
      pessoa_id: pessoa.id,
      retiro_id: inscricao.retiro_id,
      nome_retiro: retiro.nome,
      data_retiro: retiro.data_inicio,
      participou: inscricao.presente,
    });
  }
  return pessoa;
}

export async function resumoPessoas(comunidadeId: string): Promise<ResumoPessoas> {
  const pessoas = await listarPessoas(comunidadeId);
  const hoje = new Date().toISOString().slice(0, 10);
  const semanaAtras = new Date();
  semanaAtras.setDate(semanaAtras.getDate() - 7);
  const semanaAtrasIso = semanaAtras.toISOString().slice(0, 10);

  return {
    total: pessoas.length,
    vencidas: pessoas.filter((p) => p.proxima_visita && p.proxima_visita < hoje).length,
    novasSemana: pessoas.filter((p) => p.criado_em.slice(0, 10) >= semanaAtrasIso).length,
  };
}
