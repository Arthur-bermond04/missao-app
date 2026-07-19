import { supabase } from './supabase';
import type { Canal, MensagemEnviada } from '../types/database';

export async function listarMensagens(comunidadeId: string): Promise<MensagemEnviada[]> {
  const { data, error } = await supabase
    .from('mensagens_enviadas')
    .select('*')
    .eq('comunidade_id', comunidadeId)
    .order('enviado_em', { ascending: false });
  if (error) throw error;
  return (data as MensagemEnviada[]) ?? [];
}

async function contarDestinatarios(comunidadeId: string, destinatarios: string): Promise<number> {
  let query = supabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })
    .eq('comunidade_id', comunidadeId)
    .eq('ativo', true);
  if (destinatarios === 'missionarios') query = query.eq('perfil', 'missionario');
  else if (destinatarios === 'lideres') query = query.in('perfil', ['lider', 'coordenador']);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// NOTA: o envio real (FCM/Z-API/Resend) ainda não está integrado — por ora
// apenas gravamos o registro em mensagens_enviadas e contamos os destinatários.
export async function enviarMensagem(dados: {
  comunidade_id: string;
  remetente_id: string;
  canal: Canal;
  destinatarios: string;
  titulo?: string;
  corpo: string;
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
      enviado_em: new Date().toISOString(),
      total_enviados: total,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MensagemEnviada;
}
