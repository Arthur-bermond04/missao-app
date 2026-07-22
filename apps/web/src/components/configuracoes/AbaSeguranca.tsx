'use client';

import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { atualizarMembro } from '@/lib/usuarios';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Usuario } from '@/types/database';

export function AbaSeguranca({ usuario, onAtualizado }: { usuario: Usuario; onAtualizado: (campos: Partial<Usuario>) => void }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [modalConfirmarAberto, setModalConfirmarAberto] = useState(false);

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toastError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setAlterandoSenha(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setNovaSenha('');
      toastSuccess('Senha alterada com sucesso!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao alterar senha.');
    } finally {
      setAlterandoSenha(false);
    }
  }

  async function handleRedefinirDispositivo() {
    try {
      await atualizarMembro(usuario.id, { dispositivo_id: null });
      onAtualizado({ dispositivo_id: null });
      toastSuccess('Dispositivo redefinido. Você poderá logar em um novo aparelho.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao redefinir dispositivo.');
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <form onSubmit={handleAlterarSenha} className="space-y-3">
        <h3 className="text-sm font-bold text-text-primary">Alterar senha</h3>
        <Input
          type="password"
          label="Nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
        <Button type="submit" loading={alterandoSenha}>
          Alterar senha
        </Button>
      </form>

      <div>
        <h3 className="text-sm font-bold text-text-primary">Dispositivo conectado</h3>
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-border p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-xlight text-primary">
            <Smartphone size={18} />
          </div>
          <div className="min-w-0 flex-1">
            {usuario.dispositivo_id ? (
              <>
                <p className="truncate text-sm text-text-primary">{usuario.dispositivo_id}</p>
                <p className="text-xs text-text-secondary">
                  Último acesso: {usuario.ultimo_acesso ? new Date(usuario.ultimo_acesso).toLocaleString('pt-BR') : 'desconhecido'}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-secondary">Nenhum dispositivo registrado ainda.</p>
            )}
          </div>
        </div>
        {!!usuario.dispositivo_id && (
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => setModalConfirmarAberto(true)}>
            Redefinir dispositivo
          </Button>
        )}
      </div>

      <ConfirmModal
        open={modalConfirmarAberto}
        onClose={() => setModalConfirmarAberto(false)}
        onConfirm={handleRedefinirDispositivo}
        title="Redefinir dispositivo"
        description="Isso deslogará o dispositivo atual. Você vai precisar entrar de novo no próximo acesso."
        confirmLabel="Redefinir"
      />
    </div>
  );
}
