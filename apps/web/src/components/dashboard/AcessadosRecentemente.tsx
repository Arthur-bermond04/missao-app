'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IdCard, Heart, HandHeart, Tent, type LucideIcon } from 'lucide-react';
import { listarAcessosRecentes, type AcessoRecente, type TipoAcessoRecente } from '@/lib/recentes';
import { TituloCard } from '@/components/ui/TituloCard';

const ICONE_TIPO: Record<TipoAcessoRecente, LucideIcon> = {
  pessoa: IdCard,
  ovelha: Heart,
  ministerio: HandHeart,
  retiro: Tent,
};

export function AcessadosRecentemente() {
  const [itens, setItens] = useState<AcessoRecente[] | null>(null);

  useEffect(() => {
    setItens(listarAcessosRecentes());
  }, []);

  if (itens !== null && itens.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-soft bg-bg-card p-5 shadow-card">
      <TituloCard icone="recentes">Acessados recentemente</TituloCard>
      {!itens ? (
        <p className="mt-3 text-sm text-text-secondary">Carregando...</p>
      ) : (
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
