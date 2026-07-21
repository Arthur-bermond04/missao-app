import { supabase } from './supabase';
import type { CanalInteracao, EtapaJornadaPessoa, Pessoa, PessoaInteracao, TipoInteracao } from '../types/database';

export async function listarPessoas(comunidadeId: string): Promise<Pessoa[]> {
  // RLS já limita a quem cadastrou/é responsável (ou todas, se admin/coordenador)
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data as Pessoa[]) ?? [];
}

export async function buscarPessoa(id: string): Promise<Pessoa | null> {
  const { data, error } = await supabase.from('pessoas').select('*').eq('id', id).single();
  if (error) return null;
  return data as Pessoa;
}

export async function criarPessoa(dados: {
  comunidade_id: string;
  cadastrado_por: string;
  nome: string;
  telefone?: string;
  etapa_jornada?: EtapaJornadaPessoa;
  proxima_visita?: string;
}): Promise<Pessoa> {
  const { data, error } = await supabase
    .from('pessoas')
    .insert({
      comunidade_id: dados.comunidade_id,
      cadastrado_por: dados.cadastrado_por,
      nome: dados.nome,
      telefone: dados.telefone || null,
      etapa_jornada: dados.etapa_jornada ?? 'contato_inicial',
      proxima_visita: dados.proxima_visita || null,
      responsavel_id: dados.cadastrado_por,
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
    })
    .select('*')
    .single();
  if (error) throw error;
  await atualizarPessoa(dados.pessoa_id, { ultimo_contato: dados.data });
  return data as PessoaInteracao;
}

export function proximoContatoVencido(pessoa: Pessoa): boolean {
  if (!pessoa.proxima_visita) return false;
  return pessoa.proxima_visita < new Date().toISOString().slice(0, 10);
}
