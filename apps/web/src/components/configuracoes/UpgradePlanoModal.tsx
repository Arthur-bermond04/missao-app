'use client';

import { Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toastInfo } from '@/lib/toast';
import type { Plano } from '@/types/database';

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
  {
    valor: 'diocese',
    nome: 'Diocese',
    preco: 'Sob consulta',
    recursos: ['Multi-paróquia', 'Painel consolidado (todos os pastores)', 'Suporte prioritário'],
  },
];

export function UpgradePlanoModal({ open, onClose, planoAtual }: { open: boolean; onClose: () => void; planoAtual: Plano }) {
  return (
    <Modal open={open} onClose={onClose} title="Desbloquear mais recursos" size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANOS.map((p) => (
          <div
            key={p.valor}
            className={`rounded-lg border p-4 ${p.valor === planoAtual ? 'border-primary bg-primary-xlight' : 'border-border'}`}
          >
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
            <Button
              size="sm"
              fullWidth
              className="mt-4"
              variant={p.valor === planoAtual ? 'secondary' : 'primary'}
              disabled={p.valor === planoAtual}
              onClick={() => toastInfo('Contrate seu novo plano em breve — pagamento ainda não está disponível.')}
            >
              {p.valor === planoAtual ? 'Plano atual' : 'Escolher'}
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
