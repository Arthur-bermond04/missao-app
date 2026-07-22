'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { chaveMembroMinisterio, criarEncontroComPresencas, type MembroDetalhe, type MembroPessoaDetalhe } from '@/lib/ministerios';
import { toastError, toastSuccess } from '@/lib/toast';

interface RegistrarEncontroModalProps {
  open: boolean;
  onClose: () => void;
  ministerioId: string;
  membros: MembroDetalhe[];
  membrosPessoa?: MembroPessoaDetalhe[];
  onRegistrado: () => void;
}

interface EstadoPresenca {
  presente: boolean;
  justificativa: string;
}

export function RegistrarEncontroModal({
  open,
  onClose,
  ministerioId,
  membros,
  membrosPessoa = [],
  onRegistrado,
}: RegistrarEncontroModalProps) {
  const [titulo, setTitulo] = useState('Reunião');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [presencas, setPresencas] = useState<Record<string, EstadoPresenca>>({});
  const [salvando, setSalvando] = useState(false);

  const todosMembros = [...membros, ...membrosPessoa];

  useEffect(() => {
    if (open) {
      const inicial: Record<string, EstadoPresenca> = {};
      todosMembros.forEach((m) => (inicial[chaveMembroMinisterio(m)] = { presente: true, justificativa: '' }));
      setPresencas(inicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, membros, membrosPessoa]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await criarEncontroComPresencas(
        { ministerio_id: ministerioId, titulo: titulo.trim() || 'Reunião', descricao: descricao.trim() || undefined, data, local: local.trim() || undefined },
        todosMembros.map((m) => {
          const chave = chaveMembroMinisterio(m);
          return {
            usuario_id: m.usuario_id ?? undefined,
            pessoa_id: m.usuario_id ? undefined : (m.pessoa_id ?? undefined),
            presente: presencas[chave]?.presente ?? false,
            justificativa: presencas[chave]?.justificativa || undefined,
          };
        })
      );
      onRegistrado();
      onClose();
      toastSuccess('Encontro registrado!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao registrar encontro.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar encontro" size="lg">
      <form onSubmit={handleSalvar} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="w-40">
            <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
        </div>
        <Input label="Local" value={local} onChange={(e) => setLocal(e.target.value)} />
        <Textarea label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />

        <div>
          <p className="mb-2 text-xs font-semibold text-text-secondary">Presença</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {todosMembros.map((m) => {
              const chave = chaveMembroMinisterio(m);
              const estado = presencas[chave] ?? { presente: true, justificativa: '' };
              return (
                <div key={chave} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{m.nome}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPresencas((p) => ({ ...p, [chave]: { ...estado, presente: true } }))}
                        className={`rounded-md px-3 py-1 text-xs font-semibold ${
                          estado.presente ? 'bg-accent-light text-accent' : 'bg-bg-page text-text-secondary'
                        }`}
                      >
                        Presente
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresencas((p) => ({ ...p, [chave]: { ...estado, presente: false } }))}
                        className={`rounded-md px-3 py-1 text-xs font-semibold ${
                          !estado.presente ? 'bg-warning-light text-warning' : 'bg-bg-page text-text-secondary'
                        }`}
                      >
                        Ausente
                      </button>
                    </div>
                  </div>
                  {!estado.presente && (
                    <input
                      value={estado.justificativa}
                      onChange={(e) =>
                        setPresencas((p) => ({ ...p, [chave]: { ...estado, justificativa: e.target.value } }))
                      }
                      placeholder="Justificativa (opcional)"
                      className="mt-2 w-full rounded-md border border-border px-2 py-1 text-xs"
                    />
                  )}
                </div>
              );
            })}
            {todosMembros.length === 0 && <p className="text-sm text-text-secondary">Nenhum membro para registrar.</p>}
          </div>
        </div>

        <Button type="submit" fullWidth loading={salvando}>
          Salvar encontro
        </Button>
      </form>
    </Modal>
  );
}
