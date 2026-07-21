import { supabase } from './supabase';
import type { Canal, MensagemEnviada, RecorrenciaMensagem } from '../types/database';

export async function listarMensagens(comunidadeId: string): Promise<MensagemEnviada[]> {
  const { data, error } = await supabase
    .from('mensagens_enviadas')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data as MensagemEnviada[]) ?? [];
}

async function contarDestinatarios(comunidadeId: string, destinatarios: string): Promise<number> {
  // "ministerio:<id>" conta só os membros com login do ministério (pessoas
  // sem login não recebem push/e-mail/WhatsApp do app, só quem tem usuario_id)
  if (destinatarios.startsWith('ministerio:')) {
    const ministerioId = destinatarios.slice('ministerio:'.length);
    const { count, error } = await supabase
      .from('ministerio_membros')
      .select('id', { count: 'exact', head: true })
      .eq('ministerio_id', ministerioId)
      .eq('ativo', true)
      .not('usuario_id', 'is', null);
    if (error) throw error;
    return count ?? 0;
  }

  let query = supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('comunidade_id', comunidadeId).eq('ativo', true);
  if (destinatarios === 'missionarios') query = query.eq('perfil', 'missionario');
  else if (destinatarios === 'lideres') query = query.in('perfil', ['lider', 'coordenador']);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// NOTA: este projeto ainda não tem as integrações de envio configuradas
// (FCM para push, Z-API para WhatsApp, Resend para e-mail). Por enquanto,
// o envio só grava o registro em mensagens_enviadas — o disparo real
// precisa ser conectado quando essas chaves de API estiverem disponíveis.
export async function enviarMensagem(dados: {
  comunidade_id: string;
  remetente_id: string;
  canal: Canal;
  destinatarios: string;
  titulo?: string;
  corpo: string;
  enviarEm?: string;
  recorrencia?: RecorrenciaMensagem;
}): Promise<MensagemEnviada> {
  const total = await contarDestinatarios(dados.comunidade_id, dados.destinatarios);
  const { data, error } = await supabase
    .from('mensagens_enviadas')
    .insert({
      comunidade_id: dados.comunidade_id,
      remetente_id: dados.remetente_id,
      canal: dados.canal,
      destinatarios: dados.destinatarios,
      titulo: dados.titulo || null,
      corpo: dados.corpo,
      enviado_em: dados.enviarEm || new Date().toISOString(),
      total_enviados: total,
      recorrencia: dados.recorrencia || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MensagemEnviada;
}
