'use client';

import { Check, MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CardOrnamental } from '@/components/ui/Ornamento';
import type { Plano } from '@/types/database';

// TODO: trocar pelo número real da equipe (formato DDI+DDD+número, só dígitos).
const WHATSAPP_UPGRADE = '5500000000000';

const PLANOS: { valor: Plano; nome: string; preco: string; recursos: string[] }[] = [
  {
    valor: 'semente',
    nome: 'Semente',
    preco: 'Grátis',
    recursos: ['Até 50 contatos', '1 retiro ativo', 'Até 2 ministérios', 'Até 5 ovelhas na pastoral', 'Avisos simplificados'],
  },
  {
    valor: 'missao',
    nome: 'Missão',
    preco: 'R$ 39/mês',
    recursos: [
      'Contatos ilimitados',
      'Funil completo',
      'Lembretes e WhatsApp',
      'Ministérios ilimitados + caixa e doadores',
      'Pastoral ilimitada com indicadores e alertas',
      'Exportação Excel/PDF e IA',
    ],
  },
];

export function UpgradePlanoModal({ open, onClose, planoAtual }: { open: boolean; onClose: () => void; planoAtual: Plano }) {
  function abrirWhatsapp(nomePlano: string) {
    const texto = encodeURIComponent(`Olá! Quero fazer upgrade do MissãoApp para o plano ${nomePlano}.`);
    window.open(`https://wa.me/${WHATSAPP_UPGRADE}?text=${texto}`, '_blank');
  }

  return (
    <Modal open={open} onClose={onClose} title="Desbloquear mais recursos" size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANOS.map((p) => {
          const conteudo = (
            <>
              <p className="text-sm font-bold text-text-primary">{p.nome}</p>
              <p className="mt-1 text-lg font-extrabold text-primary">{p.preco}</p>
              <ul className="mt-3 space-y-1.5">
                {p.recursos.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-xs text-text-secondary">
                    <Check size={14} className="mt-0.5 shrink-0 text-accent" />
                    {r}
                  </li>
                ))}
              </ul>
              {p.valor === planoAtual ? (
                <Button size="sm" fullWidth className="mt-4" variant="secondary" disabled>
                  Plano atual
                </Button>
              ) : (
                <Button size="sm" fullWidth className="mt-4" icon={MessageCircle} onClick={() => abrirWhatsapp(p.nome)}>
                  Falar com a equipe
                </Button>
              )}
            </>
          );
          return p.valor === planoAtual ? (
            <CardOrnamental key={p.valor}>{conteudo}</CardOrnamental>
          ) : (
            <div key={p.valor} className="rounded-lg border border-border p-4">
              {conteudo}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-text-secondary">
        Para fazer upgrade, fale com a equipe pelo WhatsApp — o pagamento automático ainda não está disponível.
      </p>
    </Modal>
  );
}
