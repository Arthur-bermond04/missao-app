'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { IdCard, Heart, HandHeart, Tent, type LucideIcon } from 'lucide-react';
import { CHAVE_ACESSOS_RECENTES, lerAcessosRecentes, type TipoAcessoRecente } from '@/lib/recentes';
import { useArmazenamentoLocal } from '@/lib/hooksEstado';
import { TituloCard } from '@/components/ui/TituloCard';

const ICONE_TIPO: Record<TipoAcessoRecente, LucideIcon> = {
  pessoa: IdCard,
  ovelha: Heart,
  ministerio: HandHeart,
  retiro: Tent,
};

export function AcessadosRecentemente() {
  const [bruto] = useArmazenamentoLocal(CHAVE_ACESSOS_RECENTES);
  const itens = useMemo(() => lerAcessosRecentes(bruto), [bruto]);

  if (itens.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-soft bg-bg-card p-5 shadow-card">
      <TituloCard icone="recentes">Acessados recentemente</TituloCard>
      {(
        <div className="mt-3 flex flex-wrap gap-2">
          {itens.map((item) => {
            const Icon = ICONE_TIPO[item.tipo];
            return (
              <Link
                key={`${item.tipo}-${item.id}`}
                href={item.href}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary hover:bg-primary-xlight/30"
              >
                <Icon size={14} className="text-primary" />
                {item.titulo}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
