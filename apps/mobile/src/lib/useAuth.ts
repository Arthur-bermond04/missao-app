import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { obterDispositivoId } from './dispositivo';
import type { Usuario } from '../types/database';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [sessaoVerificada, setSessaoVerificada] = useState(false);
  const [carregando, setCarregando] = useState(true);

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
    // Espera a primeira verificação de sessão terminar antes de decidir se
    // há usuário logado — senão "carregando" cai pra false cedo demais.
    if (!sessaoVerificada) return;
    if (!session) {
      setUsuario(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setUsuario((data as Usuario) ?? null);
        setCarregando(false);
      });

    // Registra o acesso — não bloqueia a UI nem impede o login se falhar.
    obterDispositivoId().then((dispositivoId) => {
      supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString(), dispositivo_id: dispositivoId })
        .eq('id', session.user.id)
        .then(() => {});
    });
  }, [session, sessaoVerificada]);

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return { session, usuario, carregando, entrar, sair };
}
