'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Combobox } from '@/components/ui/Combobox';
import { Button } from '@/components/ui/Button';
import { lancarFinanceiroMinisterio } from '@/lib/ministerios';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  CATEGORIAS_MINISTERIO_FINANCEIRO,
  type Pessoa,
  type TipoFinanceiro,
} from '@/types/database';

interface LancamentoMinisterioModalProps {
  open: boolean;
  onClose: () => void;
  tipoInicial: TipoFinanceiro;
  ministerioId: string;
  comunidadeId: string;
  pessoas: Pessoa[];
  onLancado: () => void;
}

export function LancamentoMinisterioModal({
  open,
  onClose,
  tipoInicial,
  ministerioId,
  comunidadeId,
  pessoas,
  onLancado,
}: LancamentoMinisterioModalProps) {
  const [tipo, setTipo] = useState<TipoFinanceiro>(tipoInicial);
  const [categoria, setCategoria] = useState<string>('doacao');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [doadorId, setDoadorId] = useState('');
  const [doadorExterno, setDoadorExterno] = useState('');
  const [salvando, setSalvando] = useState(false);

  // mantém o tipo sincronizado quando o modal é aberto por um botão específico
  if (open && tipo !== tipoInicial && valor === '' && descricao === '') {
    setTipo(tipoInicial);
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    const valorNumero = Number(valor.replace(',', '.'));
    if (!valorNumero) {
      toastError('Informe um valor válido.');
      return;
    }
    setSalvando(true);
    try {
      await lancarFinanceiroMinisterio({
        ministerio_id: ministerioId,
        comunidade_id: comunidadeId,
        tipo,
        categoria,
        descricao: descricao.trim() || undefined,
        valor: valorNumero,
        doador_id: doadorId || undefined,
        doador_nome: !doadorId && doadorExterno.trim() ? doadorExterno.trim() : undefined,
        data,
      });
      setDescricao('');
      setValor('');
      setDoadorId('');
      setDoadorExterno('');
      onLancado();
      onClose();
      toastSuccess(tipo === 'receita' ? 'Receita lançada!' : 'Despesa lançada!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar lançamento.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={tipo === 'receita' ? 'Nova receita' : 'Nova despesa'}>
      <form onSubmit={handleSalvar} className="space-y-3">
        <div className="flex gap-2">
          <div className="w-1/2">
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoFinanceiro)}
              options={[
                { value: 'receita', label: 'Receita' },
                { value: 'despesa', label: 'Despesa' },
              ]}
            />
          </div>
          <div className="w-1/2">
            <Select
              label="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              options={CATEGORIAS_MINISTERIO_FINANCEIRO.map((c) => ({ value: c.valor, label: c.label }))}
            />
          </div>
        </div>
        <Input label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <div className="flex gap-2">
          <div className="w-1/2">
            <Input label="Valor (R$)" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </div>
          <div className="w-1/2">
            <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
        </div>
        <Combobox
          label="Doador (buscar em Pessoas)"
          value={doadorId}
          onChange={setDoadorId}
          placeholder="Buscar por nome..."
          emptyMessage="Nenhuma pessoa encontrada"
          options={pessoas.map((p) => ({ value: p.id, label: p.nome, sublabel: p.telefone ?? undefined }))}
        />
        {!doadorId && (
          <Input
            label="Ou nome do doador externo"
            value={doadorExterno}
            onChange={(e) => setDoadorExterno(e.target.value)}
            placeholder="Ex: Maria (não cadastrada)"
          />
        )}
        <Button type="submit" fullWidth loading={salvando} variant={tipo === 'receita' ? 'success' : 'primary'}>
          Salvar
        </Button>
      </form>
    </Modal>
  );
}
