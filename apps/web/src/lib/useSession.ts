'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { obterDispositivoId } from './dispositivo';
import type { Usuario } from '../types/database';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [perfilCarregado, setPerfilCarregado] = useState<{ id: string; usuario: Usuario | null } | null>(null);
  const [sessaoVerificada, setSessaoVerificada] = useState(false);

  // O perfil acompanha o usuário da sessão: enquanto o do usuário atual não chegou,
  // "carregando" fica verdadeiro — e só cai depois que a sessão foi verificada.
  const userId = session?.user.id ?? null;
  const usuario = userId && perfilCarregado?.id === userId ? perfilCarregado.usuario : null;
  const carregando = !sessaoVerificada || (!!userId && perfilCarregado?.id !== userId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessaoVerificada(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao);
      setSessaoVerificada(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Sem sessão verificada ou sem usuário logado não há perfil para ler.
    if (!userId) return;
    let ativo = true;
    supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (ativo) setPerfilCarregado({ id: userId, usuario: (data as Usuario) ?? null });
      });

    // Registra o acesso — não bloqueia a UI nem impede o login se falhar.
    // Reaproveita o mesmo dispositivo_id enquanto o usuário não trocar de
    // navegador nem clicar em "Redefinir dispositivo" em Configurações.
    supabase
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString(), dispositivo_id: obterDispositivoId() })
      .eq('id', userId)
      .then(() => {});

    return () => {
      ativo = false;
    };
  }, [userId]);

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return { session, usuario, carregando, entrar, sair };
}
