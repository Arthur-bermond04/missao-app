'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { atualizarEncontroPastoral, criarEncontroPastoral } from '@/lib/pastoral';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  ESTADOS_OVELHA_ENCONTRO,
  TEMAS_PASTORAL,
  type EstadoOvelhaEncontro,
  type PastoralEncontro,
  type TemaPastoral,
  type TipoEncontroPastoral,
} from '@/types/database';

const TIPOS: { valor: TipoEncontroPastoral; label: string }[] = [
  { valor: 'presencial', label: 'Presencial' },
  { valor: 'online', label: 'Online' },
  { valor: 'telefone', label: 'Telefone' },
  { valor: 'mensagem', label: 'Mensagem' },
];

const ABERTURA_LABEL: Record<number, string> = {
  1: 'Muito fechado',
  2: 'Fechado',
  3: 'Neutro',
  4: 'Aberto',
  5: 'Muito aberto',
};

interface Props {
  open: boolean;
  onClose: () => void;
  ovelhaId: string;
  pastorId: string;
  onRegistrado: () => void;
  encontroEditar?: PastoralEncontro | null;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function RegistrarEncontroPastoralModal({
  open,
  onClose,
  ovelhaId,
  pastorId,
  onRegistrado,
  encontroEditar,
}: Props) {
  const editando = !!encontroEditar;
  const [data, setData] = useState(hoje());
  const [tipo, setTipo] = useState<TipoEncontroPastoral>('presencial');
  const [duracao, setDuracao] = useState('');
  const [estado, setEstado] = useState<EstadoOvelhaEncontro>('estavel');
  const [temas, setTemas] = useState<TemaPastoral[]>([]);
  const [relato, setRelato] = useState('');
  const [encaminhamentos, setEncaminhamentos] = useState('');
  const [proximaReuniao, setProximaReuniao] = useState('');
  const [abertura, setAbertura] = useState(3);
  const [salvando, setSalvando] = useState(false);

  // sincroniza os campos com o encontro em edição (ou reseta para criação)
  useEffect(() => {
    if (!open) return;
    if (encontroEditar) {
      setData(encontroEditar.data);
      setTipo(encontroEditar.tipo);
      setDuracao(encontroEditar.duracao_minutos ? String(encontroEditar.duracao_minutos) : '');
      setEstado(encontroEditar.estado_ovelha);
      setTemas(encontroEditar.temas_abordados ?? []);
      setRelato(encontroEditar.relato);
      setEncaminhamentos(encontroEditar.encaminhamentos ?? '');
      setProximaReuniao(encontroEditar.proxima_reuniao ?? '');
      setAbertura(encontroEditar.nivel_abertura ?? 3);
    } else {
      setData(hoje());
      setTipo('presencial');
      setDuracao('');
      setEstado('estavel');
      setTemas([]);
      setRelato('');
      setEncaminhamentos('');
      setProximaReuniao('');
      setAbertura(3);
    }
  }, [open, encontroEditar]);

  function toggleTema(t: TemaPastoral) {
    setTemas((atual) => (atual.includes(t) ? atual.filter((x) => x !== t) : [...atual, t]));
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (relato.trim().length < 3) {
      toastError('Escreva um relato do encontro.');
      return;
    }
    setSalvando(true);
    try {
      if (editando && encontroEditar) {
        await atualizarEncontroPastoral(encontroEditar.id, {
          data,
          tipo,
          duracao_minutos: duracao ? Number(duracao) : null,
          estado_ovelha: estado,
          temas_abordados: temas,
          relato: relato.trim(),
          encaminhamentos: encaminhamentos.trim() || null,
          proxima_reuniao: proximaReuniao || null,
          nivel_abertura: abertura,
        });
        toastSuccess('Encontro atualizado!');
      } else {
        await criarEncontroPastoral({
          ovelha_id: ovelhaId,
          pastor_id: pastorId,
          data,
          duracao_minutos: duracao ? Number(duracao) : undefined,
          tipo,
          estado_ovelha: estado,
          temas_abordados: temas,
          relato: relato.trim(),
          encaminhamentos: encaminhamentos.trim() || undefined,
          proxima_reuniao: proximaReuniao || undefined,
          nivel_abertura: abertura,
        });
        toastSuccess('Encontro registrado!');
      }
      onRegistrado();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar encontro.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar encontro' : 'Registrar encontro'} size="lg">
      <form onSubmit={handleSalvar} className="space-y-3">
        <div className="flex gap-2">
          <div className="w-1/2">
            <Input label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div className="w-1/2">
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEncontroPastoral)}
              options={TIPOS.map((t) => ({ value: t.valor, label: t.label }))}
            />
          </div>
        </div>

        <Input label="Duração (minutos)" type="number" value={duracao} onChange={(e) => setDuracao(e.target.value)} />

        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">Como ela estava?</label>
          <div className="flex flex-wrap gap-2">
            {ESTADOS_OVELHA_ENCONTRO.map((e) => (
              <button
                key={e.valor}
                type="button"
                onClick={() => setEstado(e.valor)}
                className={`flex items-center gap-1 rounded-md border px-3 py-2 text-sm ${
                  estado === e.valor ? 'border-primary bg-primary-xlight text-primary' : 'border-border text-text-secondary'
                }`}
              >
                <span>{e.emoji}</span>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">Temas abordados</label>
          <div className="flex flex-wrap gap-2">
            {TEMAS_PASTORAL.map((t) => (
              <button
                key={t.valor}
                type="button"
                onClick={() => toggleTema(t.valor)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  temas.includes(t.valor) ? 'bg-primary text-white' : 'bg-bg-page text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea label="O que foi conversado" value={relato} onChange={(e) => setRelato(e.target.value)} rows={4} required />
        <Textarea
          label="Combinamos para próxima vez"
          value={encaminhamentos}
          onChange={(e) => setEncaminhamentos(e.target.value)}
          rows={2}
        />
        <Input
          label="Próxima reunião"
          type="date"
          value={proximaReuniao}
          onChange={(e) => setProximaReuniao(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">
            Nível de abertura: {abertura} — {ABERTURA_LABEL[abertura]}
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={abertura}
            onChange={(e) => setAbertura(Number(e.target.value))}
            className="w-full accent-accent-green"
          />
        </div>

        <Button type="submit" fullWidth loading={salvando}>
          {editando ? 'Salvar alterações' : 'Salvar'}
        </Button>
      </form>
    </Modal>
  );
}
