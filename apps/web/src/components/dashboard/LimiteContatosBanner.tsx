import { AlertTriangle } from 'lucide-react';

interface LimiteContatosBannerProps {
  usados: number;
  limite: number;
  onUpgradeClick: () => void;
}

export function LimiteContatosBanner({ usados, limite, onUpgradeClick }: LimiteContatosBannerProps) {
  const percentual = (usados / limite) * 100;
  if (percentual < 90) return null;
  const atingiuLimite = percentual >= 100;

  return (
    <div
      className="mb-6 flex items-center justify-between gap-3 rounded-md px-4 py-3 text-sm"
      style={
        atingiuLimite
          ? { backgroundColor: '#FEE2E2', border: '1px solid #DC2626', color: '#991B1B' }
          : { backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E' }
      }
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} />
        <span>
          {atingiuLimite
            ? `Limite atingido. Você usou ${usados} de ${limite} contatos disponíveis no plano Semente. Novos contatos não podem ser cadastrados.`
            : `Você está usando ${usados} de ${limite} contatos disponíveis no plano Semente.`}
        </span>
      </div>
      <button onClick={onUpgradeClick} className="shrink-0 font-semibold underline">
        {atingiuLimite ? 'Desbloquear agora →' : 'Fazer upgrade →'}
      </button>
    </div>
  );
}
