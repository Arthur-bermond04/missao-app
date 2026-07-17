import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Retiro } from '@/types/database';

interface RetiroCardProps {
  retiro: Retiro;
  ativo: boolean;
  totalInscritos: number;
  onClick: () => void;
}

export function RetiroCard({ retiro, ativo, totalInscritos, onClick }: RetiroCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
        ativo ? 'border-primary bg-primary-xlight' : 'border-transparent hover:bg-bg-page'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`font-semibold ${ativo ? 'text-primary' : 'text-text-primary'}`}>{retiro.nome}</span>
        <Badge variant={retiro.status} showIcon={false} />
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
        <Calendar size={12} />
        {new Date(retiro.data_inicio).toLocaleDateString('pt-BR')}
      </div>
      {!!retiro.vagas && (
        <p className="mt-1 text-xs text-text-secondary">
          {totalInscritos} / {retiro.vagas} vagas
        </p>
      )}
    </button>
  );
}
