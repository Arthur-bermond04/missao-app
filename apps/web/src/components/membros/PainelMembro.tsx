'use client';

import { useEffect, useState } from 'react';
import { SidePanel } from '@/components/ui/SidePanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { listarMinisteriosDoUsuario } from '@/lib/ministerios';
import { listarOvelhasDoPastor } from '@/lib/pastoral';
import { PERFIL_LABEL, type MembroComContagem } from '@/lib/usuarios';
import type { Contato, Ministerio, PastoralOvelha } from '@/types/database';

export function PainelMembro({
  membro,
  onClose,
  onEditar,
  onDesativar,
}: {
  membro: MembroComContagem | null;
  onClose: () => void;
  onEditar: (m: MembroComContagem) => void;
  onDesativar: (m: MembroComContagem) => void;
}) {
  const [contatosRecentes, setContatosRecentes] = useState<Contato[]>([]);
  const [ministerios, setMinisterios] = useState<Ministerio[]>([]);
  const [ovelhas, setOvelhas] = useState<PastoralOvelha[]>([]);

  useEffect(() => {
    if (!membro) return;
    supabase
      .from('contatos')
      .select('*')
      .eq('missionario_id', membro.id)
      .order('data_abordagem', { ascending: false })
      .limit(5)
      .then(({ data }) => setContatosRecentes((data as Contato[]) ?? []));
    listarMinisteriosDoUsuario(membro.id).then(setMinisterios);
    listarOvelhasDoPastor(membro.id).then(setOvelhas);
  }, [membro]);

  if (!membro) return null;

  return (
    <SidePanel open={!!membro} onClose={onClose} title={membro.nome} description={PERFIL_LABEL[membro.perfil]}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-text-secondary">Telefone</p>
            <p className="font-medium text-text-primary">{membro.telefone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Status</p>
            <Badge variant={membro.ativo ? 'ativo' : 'inativo'} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Contatos cadastrados</p>
            <p className="font-medium text-text-primary">{membro.contatos_cadastrados}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Último acesso</p>
            <p className="font-medium text-text-primary">
              {membro.ultimo_acesso ? new Date(membro.ultimo_acesso).toLocaleDateString('pt-BR') : 'Nunca'}
            </p>
          </div>
        </div>

        {membro.perfil === 'missionario' && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
              Contatos recentes ({membro.contatos_cadastrados})
            </p>
            {contatosRecentes.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum contato cadastrado ainda.</p>
            ) : (
              <ul className="space-y-1">
                {contatosRecentes.map((c) => (
                  <li key={c.id} className="rounded-md border border-border px-2.5 py-1.5 text-sm text-text-primary">
                    {c.nome}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">Ministérios</p>
          {ministerios.length === 0 ? (
            <p className="text-sm text-text-secondary">Não participa de nenhum ministério.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ministerios.map((m) => (
                <span key={m.id} className="rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: m.cor }}>
                  {m.nome}
                </span>
              ))}
            </div>
          )}
        </div>

        {ovelhas.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
              Ovelhas que acompanha ({ovelhas.length})
            </p>
            <ul className="space-y-1">
              {ovelhas.map((o) => (
                <li key={o.id} className="rounded-md border border-border px-2.5 py-1.5 text-sm text-text-primary">
                  {o.nome}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 border-t border-border pt-4">
          <Button size="sm" variant="secondary" onClick={() => onEditar(membro)}>
            Editar
          </Button>
          <Button size="sm" variant={membro.ativo ? 'danger' : 'success'} onClick={() => onDesativar(membro)}>
            {membro.ativo ? 'Desativar' : 'Reativar'}
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}
