'use client';

import { useEffect, useState } from 'react';
import { useAoMudar, useHashDaUrl } from '@/lib/hooksEstado';
import { Lock, Settings } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { AbaComunidade } from '@/components/configuracoes/AbaComunidade';
import { AbaPlano } from '@/components/configuracoes/AbaPlano';
import { AbaFinanceiro } from '@/components/configuracoes/AbaFinanceiro';
import { AbaIntegracoes } from '@/components/configuracoes/AbaIntegracoes';
import { AbaNotificacoes } from '@/components/configuracoes/AbaNotificacoes';
import { AbaSeguranca } from '@/components/configuracoes/AbaSeguranca';
import { AbaDuplicatas } from '@/components/configuracoes/AbaDuplicatas';
import { AbaPermissoes } from '@/components/configuracoes/AbaPermissoes';
import { AbaAparencia } from '@/components/configuracoes/AbaAparencia';
import { carregarCorDestaque } from '@/lib/aparencia';
import { buscarComunidade } from '@/lib/comunidades';
import type { Comunidade, Usuario } from '@/types/database';

type Aba =
  | 'comunidade'
  | 'plano'
  | 'financeiro'
  | 'integracoes'
  | 'notificacoes'
  | 'seguranca'
  | 'aparencia'
  | 'permissoes'
  | 'duplicatas';

const ABAS: { valor: Aba; label: string }[] = [
  { valor: 'comunidade', label: 'Comunidade' },
  { valor: 'plano', label: 'Plano' },
  { valor: 'financeiro', label: 'Financeiro' },
  { valor: 'integracoes', label: 'Integrações' },
  { valor: 'notificacoes', label: 'Notificações' },
  { valor: 'seguranca', label: 'Segurança' },
];

// Abas que editam dados da comunidade (comunidades) — a RLS só permite
// UPDATE por admin, então avisamos quem não é admin antes de tentar salvar.
const ABAS_SOMENTE_ADMIN_EDITA: Aba[] = ['comunidade', 'financeiro', 'integracoes'];

const ABAS_VALIDAS = new Set<string>(['comunidade', 'plano', 'financeiro', 'integracoes', 'notificacoes', 'seguranca', 'aparencia', 'permissoes', 'duplicatas']);

export default function ConfiguracoesPage() {
  const { usuario, pode, permissoes } = usePainelSession();
  const [corDestaque, setCorDestaque] = useState<string | null>(null);
  const hash = useHashDaUrl();
  const [abaEscolhida, setAba] = useState<Aba | null>(null);
  const aba: Aba = abaEscolhida ?? (ABAS_VALIDAS.has(hash) ? (hash as Aba) : 'comunidade');
  const [comunidade, setComunidade] = useState<Comunidade | null>(null);
  const [usuarioLocal, setUsuarioLocal] = useState<Usuario | null>(usuario ?? null);

  // Abre direto numa aba via /configuracoes#seguranca — usado pelo atalho
  // "Trocar senha" do menu do usuário. Lê o hash em vez de useSearchParams
  // pra não precisar de Suspense boundary só por isso.
  useAoMudar([usuario], () => {
    setUsuarioLocal(usuario ?? null);
  });

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    buscarComunidade(usuario.comunidade_id).then(setComunidade);
    carregarCorDestaque(usuario.comunidade_id).then(setCorDestaque);
  }, [usuario?.comunidade_id]);

  // Permissões aparece para todos (quem não é admin vê em modo leitura, para
  // entender por que um menu sumiu); Duplicatas continua só para admin.
  // Aparência segue a matriz (módulo "aparencia"); se a migration ainda não rodou, só admin.
  const veAparencia = permissoes['aparencia'] ? pode('aparencia', 'ver') : usuario?.perfil === 'admin';
  const abasBase = veAparencia ? [...ABAS, { valor: 'aparencia' as const, label: 'Aparência' }] : ABAS;
  const abasVisiveis =
    usuario?.perfil === 'admin'
      ? [...abasBase, { valor: 'permissoes' as const, label: 'Permissões' }, { valor: 'duplicatas' as const, label: 'Duplicatas' }]
      : [...abasBase, { valor: 'permissoes' as const, label: 'Permissões' }];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={Settings} tom="neutro" title="Configurações" subtitle="Comunidade, plano, notificações e segurança" />

      <div className="mt-6 flex gap-1 border-b border-border-soft">
        {abasVisiveis.map((a) => (
          <button
            key={a.valor}
            onClick={() => setAba(a.valor)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === a.valor ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {ABAS_SOMENTE_ADMIN_EDITA.includes(aba) && usuario?.perfil !== 'admin' && (
        <div className="mt-6 flex items-center gap-2 rounded-md bg-warning-light px-3 py-2 text-sm text-warning">
          <Lock size={14} />
          Você pode visualizar, mas só o admin da comunidade pode salvar alterações nesta aba.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border-soft bg-bg-card p-5 shadow-card">
        {aba === 'comunidade' && (comunidade ? <AbaComunidade comunidade={comunidade} onAtualizada={setComunidade} /> : <p className="text-sm text-text-secondary">Carregando...</p>)}
        {aba === 'plano' && (comunidade ? <AbaPlano comunidade={comunidade} /> : <p className="text-sm text-text-secondary">Carregando...</p>)}
        {aba === 'financeiro' &&
          (comunidade ? <AbaFinanceiro comunidade={comunidade} onAtualizada={setComunidade} /> : <p className="text-sm text-text-secondary">Carregando...</p>)}
        {aba === 'integracoes' &&
          (comunidade ? <AbaIntegracoes comunidade={comunidade} onAtualizada={setComunidade} /> : <p className="text-sm text-text-secondary">Carregando...</p>)}
        {aba === 'notificacoes' && (usuarioLocal ? <AbaNotificacoes usuario={usuarioLocal} /> : <p className="text-sm text-text-secondary">Carregando...</p>)}
        {aba === 'seguranca' &&
          (usuarioLocal ? (
            <AbaSeguranca
              usuario={usuarioLocal}
              onAtualizado={(campos) => setUsuarioLocal((atual) => (atual ? { ...atual, ...campos } : atual))}
            />
          ) : (
            <p className="text-sm text-text-secondary">Carregando...</p>
          ))}
        {aba === 'aparencia' &&
          (usuario?.comunidade_id ? (
            <AbaAparencia comunidadeId={usuario.comunidade_id} corSalva={corDestaque} onSalva={setCorDestaque} />
          ) : (
            <p className="text-sm text-text-secondary">Carregando...</p>
          ))}
        {aba === 'permissoes' &&
          (usuario?.comunidade_id ? (
            <AbaPermissoes comunidadeId={usuario.comunidade_id} ehAdmin={usuario.perfil === 'admin'} />
          ) : (
            <p className="text-sm text-text-secondary">Carregando...</p>
          ))}
        {aba === 'duplicatas' && usuario?.comunidade_id && usuario.perfil === 'admin' && (
          <AbaDuplicatas comunidadeId={usuario.comunidade_id} cadastradoPor={usuario.id} />
        )}
      </div>
    </div>
  );
}
