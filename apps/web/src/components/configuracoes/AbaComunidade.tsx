'use client';

import { useState } from 'react';
import { Camera, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { atualizarComunidade } from '@/lib/comunidades';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Comunidade, HorarioMissa } from '@/types/database';

const OPCOES_TIPO = [
  { value: 'paróquia', label: 'Paróquia' },
  { value: 'comunidade', label: 'Comunidade' },
  { value: 'movimento', label: 'Movimento' },
];

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function AbaComunidade({ comunidade, onAtualizada }: { comunidade: Comunidade; onAtualizada: (c: Comunidade) => void }) {
  const [nome, setNome] = useState(comunidade.nome);
  const [tipo, setTipo] = useState(comunidade.tipo);
  const [telefone, setTelefone] = useState(comunidade.telefone ?? '');
  const [horariosMissa, setHorariosMissa] = useState<HorarioMissa[]>(comunidade.horarios_missa ?? []);
  const [novoDia, setNovoDia] = useState(DIAS_SEMANA[0]);
  const [novoHorario, setNovoHorario] = useState('');
  const [novoLocal, setNovoLocal] = useState('');
  const [salvando, setSalvando] = useState(false);

  function adicionarMissa() {
    if (!novoHorario) return;
    setHorariosMissa((atual) => [...atual, { dia_semana: novoDia, horario: novoHorario, local: novoLocal.trim() }]);
    setNovoHorario('');
    setNovoLocal('');
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const campos = { nome: nome.trim(), tipo, telefone: telefone.trim() || null, horarios_missa: horariosMissa };
      await atualizarComunidade(comunidade.id, campos);
      onAtualizada({ ...comunidade, ...campos });
      toastSuccess('Dados da comunidade atualizados.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSalvar} className="max-w-md space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-page text-text-secondary">
          <Camera size={22} />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Logotipo</p>
          <p className="text-xs text-text-secondary">Upload de imagem em breve.</p>
        </div>
      </div>

      <Input label="Nome da comunidade" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} options={OPCOES_TIPO} />
      <Input label="Telefone de contato" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />

      <div>
        <p className="mb-1 text-xs font-semibold text-text-secondary">Horários de missa</p>
        {horariosMissa.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {horariosMissa.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-text-primary">
                  {h.dia_semana} · {h.horario}
                  {h.local ? ` · ${h.local}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setHorariosMissa((atual) => atual.filter((_, idx) => idx !== i))}
                  className="text-text-secondary hover:text-danger"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1">
            <Select value={novoDia} onChange={(e) => setNovoDia(e.target.value)} options={DIAS_SEMANA.map((d) => ({ value: d, label: d }))} />
          </div>
          <div className="w-28">
            <Input type="time" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} />
          </div>
          <div className="min-w-[120px] flex-1">
            <Input placeholder="Local (opcional)" value={novoLocal} onChange={(e) => setNovoLocal(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" size="md" icon={Plus} onClick={adicionarMissa}>
            Adicionar
          </Button>
        </div>
      </div>

      <Button type="submit" loading={salvando}>
        Salvar alterações
      </Button>
    </form>
  );
}
