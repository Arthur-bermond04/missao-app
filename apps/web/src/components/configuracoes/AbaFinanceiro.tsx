'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { atualizarComunidade } from '@/lib/comunidades';
import { toastError, toastSuccess } from '@/lib/toast';
import { CATEGORIAS_FINANCEIRO, type Comunidade } from '@/types/database';

export function AbaFinanceiro({
  comunidade,
  onAtualizada,
}: {
  comunidade: Comunidade;
  onAtualizada: (c: Comunidade) => void;
}) {
  const [meta, setMeta] = useState(comunidade.meta_arrecadacao_mensal?.toString() ?? '');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [categorias, setCategorias] = useState<string[]>(comunidade.categorias_financeiras ?? []);
  const [banco, setBanco] = useState(comunidade.banco ?? '');
  const [agencia, setAgencia] = useState(comunidade.agencia ?? '');
  const [conta, setConta] = useState(comunidade.conta ?? '');
  const [salvando, setSalvando] = useState(false);

  const categoriasBase: readonly string[] = CATEGORIAS_FINANCEIRO;

  function adicionarCategoria() {
    const nome = novaCategoria.trim().toLowerCase();
    if (!nome || categoriasBase.includes(nome) || categorias.includes(nome)) return;
    setCategorias((atual) => [...atual, nome]);
    setNovaCategoria('');
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const campos = {
        meta_arrecadacao_mensal: meta ? Number(meta) : null,
        categorias_financeiras: categorias,
        banco: banco.trim() || null,
        agencia: agencia.trim() || null,
        conta: conta.trim() || null,
      };
      await atualizarComunidade(comunidade.id, campos);
      onAtualizada({ ...comunidade, ...campos });
      toastSuccess('Configurações financeiras atualizadas.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSalvar} className="max-w-md space-y-5">
      <Input
        label="Meta de arrecadação mensal (R$)"
        type="number"
        step="0.01"
        value={meta}
        onChange={(e) => setMeta(e.target.value)}
        hint="Aparece como barra de progresso na página Financeiro."
      />

      <div>
        <p className="mb-1 text-xs font-semibold text-text-secondary">Categorias financeiras extras</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_FINANCEIRO.map((c) => (
            <span key={c} className="rounded-full bg-bg-page px-2.5 py-1 text-xs text-text-secondary">
              {c}
            </span>
          ))}
          {categorias.map((c) => (
            <span key={c} className="flex items-center gap-1 rounded-full bg-primary-xlight px-2.5 py-1 text-xs text-primary">
              {c}
              <button type="button" onClick={() => setCategorias((atual) => atual.filter((x) => x !== c))}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            placeholder="Nova categoria"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                adicionarCategoria();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={adicionarCategoria}>
            Adicionar
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-text-secondary">Dados bancários (referência interna)</p>
        <div className="space-y-2">
          <Input label="Banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
          <div className="flex gap-2">
            <Input label="Agência" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
            <Input label="Conta" value={conta} onChange={(e) => setConta(e.target.value)} />
          </div>
        </div>
      </div>

      <Button type="submit" loading={salvando}>
        Salvar alterações
      </Button>
    </form>
  );
}
