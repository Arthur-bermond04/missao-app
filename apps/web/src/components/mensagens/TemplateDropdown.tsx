'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { criarTemplate } from '@/lib/mensagensTemplates';
import { toastSuccess, toastError } from '@/lib/toast';
import type { MensagemTemplate } from '@/types/database';

interface TemplateDropdownProps {
  templates: MensagemTemplate[];
  onUsarTemplate: (template: MensagemTemplate) => void;
  comunidadeId: string;
  tituloAtual: string;
  corpoAtual: string;
  onTemplateCriado: (template: MensagemTemplate) => void;
}

export function TemplateDropdown({
  templates,
  onUsarTemplate,
  comunidadeId,
  tituloAtual,
  corpoAtual,
  onTemplateCriado,
}: TemplateDropdownProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [nomeTemplate, setNomeTemplate] = useState('');
  const [salvando, setSalvando] = useState(false);

  function handleSelecionar(id: string) {
    const template = templates.find((t) => t.id === id);
    if (template) onUsarTemplate(template);
  }

  async function handleSalvarTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!corpoAtual.trim()) {
      toastError('Escreva a mensagem antes de salvar como template.');
      return;
    }
    setSalvando(true);
    try {
      const novo = await criarTemplate({
        comunidade_id: comunidadeId,
        nome: nomeTemplate.trim(),
        titulo: tituloAtual.trim() || undefined,
        corpo: corpoAtual.trim(),
      });
      onTemplateCriado(novo);
      setNomeTemplate('');
      setModalAberto(false);
      toastSuccess('Template salvo!');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar template.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <div className="min-w-[200px]">
        <Select
          label="Usar template"
          value=""
          onChange={(e) => handleSelecionar(e.target.value)}
          options={[{ value: '', label: 'Selecione um template' }, ...templates.map((t) => ({ value: t.id, label: t.nome }))]}
        />
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={() => setModalAberto(true)}>
        Salvar como template
      </Button>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Salvar como template">
        <form onSubmit={handleSalvarTemplate} className="space-y-3">
          <Input
            label="Nome do template"
            value={nomeTemplate}
            onChange={(e) => setNomeTemplate(e.target.value)}
            placeholder="Ex: Lembrete de missa de domingo"
            required
          />
          <p className="text-xs text-text-secondary">Salva o título e a mensagem atuais do formulário.</p>
          <Button type="submit" fullWidth loading={salvando}>
            Salvar template
          </Button>
        </form>
      </Modal>
    </div>
  );
}
