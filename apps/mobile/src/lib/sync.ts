import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import {
  listarPendentesSincronizacao,
  marcarComoSincronizado,
  upsertContatosRemotos,
} from './localDb';

let sincronizando = false;

export async function sincronizarContatos(): Promise<{ enviados: number; recebidos: number }> {
  if (sincronizando) return { enviados: 0, recebidos: 0 };

  const net = await NetInfo.fetch();
  if (!net.isConnected) return { enviados: 0, recebidos: 0 };

  sincronizando = true;
  try {
    const pendentes = await listarPendentesSincronizacao();
    for (const contato of pendentes) {
      const { error } = await supabase.from('contatos').upsert({
        id: contato.id,
        comunidade_id: contato.comunidade_id,
        missionario_id: contato.missionario_id,
        nome: contato.nome,
        telefone: contato.telefone,
        idade: contato.idade,
        nivel_interesse: contato.nivel_interesse,
        local_abordagem: contato.local_abordagem,
        latitude: contato.latitude,
        longitude: contato.longitude,
        data_abordagem: contato.data_abordagem,
        tags: contato.tags,
        observacoes: contato.observacoes,
        etapa_jornada: contato.etapa_jornada,
        proximo_contato: contato.proximo_contato,
      });
      if (!error) {
        await marcarComoSincronizado(contato.id);
      }
    }

    const { data: remotos } = await supabase
      .from('contatos')
      .select('*')
      .order('data_abordagem', { ascending: false });

    if (remotos) {
      await upsertContatosRemotos(remotos as any);
    }

    return { enviados: pendentes.length, recebidos: remotos?.length ?? 0 };
  } finally {
    sincronizando = false;
  }
}

export function observarConexaoESincronizar(onSync?: () => void) {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      sincronizarContatos().then(() => onSync?.());
    }
  });
}
