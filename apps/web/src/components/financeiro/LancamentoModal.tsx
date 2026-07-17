'use client';

import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CATEGORIAS_FINANCEIRO, type TipoFinanceiro } from '@/types/database';

const OPCOES_CATEGORIA = CATEGORIAS_FINANCEIRO.map((c) => ({ value: c, label: c }));

interface LancamentoModalProps {
  open: boolean;
  onClose: () => void;
  tipo: TipoFinanceiro;
  onTipoChange: (tipo: TipoFinanceiro) => void;
  categoria: string;
  onCategoriaChange: (categoria: string) => void;
  descricao: string;
  onDescricaoChange: (descricao: string) => void;
  valor: string;
  onValorChange: (valor: string) => void;
  data: string;
  onDataChange: (data: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  salvando?: boolean;
}

export function LancamentoModal({
  open,
  onClose,
  tipo,
  onTipoChange,
  categoria,
  onCategoriaChange,
  descricao,
  onDescricaoChange,
  valor,
  onValorChange,
  data,
  onDataChange,
  onSubmit,
  salvando,
}: LancamentoModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={tipo === 'receita' ? 'Nova receita' : 'Nova despesa'}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="w-1/2">
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => onTipoChange(e.target.value as TipoFinanceiro)}
              options={[
                { value: 'receita', label: 'Receita' },
                { value: 'despesa', label: 'Despesa' },
              ]}
            />
          </div>
          <div className="w-1/2">
            <Select label="Categoria" value={categoria} onChange={(e) => onCategoriaChange(e.target.value)} options={OPCOES_CATEGORIA} />
          </div>
        </div>
        <Input label="Descrição (opcional)" value={descricao} onChange={(e) => onDescricaoChange(e.target.value)} />
        <div className="flex gap-2">
          <div className="w-1/2">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => onValorChange(e.target.value)}
              required
            />
          </div>
          <div className="w-1/2">
            <Input label="Data" type="date" value={data} onChange={(e) => onDataChange(e.target.value)} required />
          </div>
        </div>
        <Button type="submit" fullWidth loading={salvando} variant={tipo === 'receita' ? 'success' : 'primary'}>
          {salvando ? 'Salvando...' : tipo === 'receita' ? 'Lançar receita' : 'Lançar despesa'}
        </Button>
      </form>
    </Modal>
  );
}
