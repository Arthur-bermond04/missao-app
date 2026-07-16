import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { Contato, NivelInteresse } from '../types/database';
import { initLocalDb, listarContatosLocais, salvarContatoLocal } from './localDb';
import { sincronizarContatos } from './sync';

export function useContatos(comunidadeId: string, missionarioId: string) {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const lista = await listarContatosLocais();
    setContatos(lista);
  }, []);

  useEffect(() => {
    (async () => {
      await initLocalDb();
      await carregar();
      setCarregando(false);
      sincronizarContatos().then(carregar);
    })();
  }, [carregar]);

  const novoContato = useCallback(
    async (dados: {
      nome: string;
      telefone?: string;
      idade?: number;
      nivel_interesse: NivelInteresse;
      local_abordagem?: string;
      latitude?: number;
      longitude?: number;
      tags: string[];
      observacoes?: string;
    }) => {
      const id = Crypto.randomUUID();
      await salvarContatoLocal({
        id,
        comunidade_id: comunidadeId,
        missionario_id: missionarioId,
        ...dados,
      });
      await carregar();
      sincronizarContatos().then(carregar);
      return id;
    },
    [carregar, comunidadeId, missionarioId]
  );

  return { contatos, carregando, recarregar: carregar, novoContato };
}
