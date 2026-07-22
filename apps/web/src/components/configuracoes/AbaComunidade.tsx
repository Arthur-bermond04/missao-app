'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { atualizarComunidade } from '@/lib/comunidades';
import { listarTiposEvento, criarTipoEvento, removerTipoEvento } from '@/lib/tiposEvento';
import { toastError, toastSuccess } from '@/lib/toast';
import { TERMINOLOGIA_PADRAO, type Comunidade, type HorarioMissa, type Terminologia, type TipoEventoComunidade } from '@/types/database';

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
  const [terminologia, setTerminologia] = useState<Terminologia>({
    ...TERMINOLOGIA_PADRAO,
    ...comunidade.terminologia,
  });
  const [salvando, setSalvando] = useState(false);

  const [tiposEvento, setTiposEvento] = useState<TipoEventoComunidade[]>([]);
  const [novoTipoEvento, setNovoTipoEvento] = useState('');
  const [salvandoTipo, setSalvandoTipo] = useState(false);

  useEffect(() => {
    listarTiposEvento(comunidade.id).then(setTiposEvento);
  }, [comunidade.id]);

  async function handleAdicionarTipoEvento() {
    const nome = novoTipoEvento.trim();
    if (!nome) return;
    if (tiposEvento.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) {
      toastError('Esse tipo de evento já existe.');
      return;
    }
    setSalvandoTipo(true);
    try {
      const criado = await criarTipoEvento(comunidade.id, nome);
      setTiposEvento((atual) => [...atual, criado].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovoTipoEvento('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao adicionar tipo de evento.');
    } finally {
      setSalvandoTipo(false);
    }
  }

  async function handleRemoverTipoEvento(tipo: TipoEventoComunidade) {
    try {
      await removerTipoEvento(tipo.id);
      setTiposEvento((atual) => atual.filter((t) => t.id !== tipo.id));
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao remover tipo de evento.');
    }
  }

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
      const campos = {
        nome: nome.trim(),
        tipo,
        telefone: telefone.trim() || null,
        horarios_missa: horariosMissa,
        terminologia,
      };
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

      <div>
        <p className="text-xs font-semibold text-text-secondary">Terminologia</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          Sua comunidade pode usar nomes diferentes dos padrões da Shalom — os valores abaixo trocam os rótulos em
          todo o app (o que é salvo no banco não muda, só como aparece na tela).
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Input
            label='Nome da etapa "CV"'
            value={terminologia.etapa_cv}
            onChange={(e) => setTerminologia((t) => ({ ...t, etapa_cv: e.target.value || TERMINOLOGIA_PADRAO.etapa_cv }))}
            placeholder="Ex: Formação, Catecúmeno"
          />
          <Input
            label='Nome da etapa "CAL"'
            value={terminologia.etapa_cal}
            onChange={(e) => setTerminologia((t) => ({ ...t, etapa_cal: e.target.value || TERMINOLOGIA_PADRAO.etapa_cal }))}
            placeholder="Ex: Aliança, Batismo"
          />
          <Input
            label="Nome do acompanhamento pastoral"
            value={terminologia.nome_ovelha}
            onChange={(e) => setTerminologia((t) => ({ ...t, nome_ovelha: e.target.value || TERMINOLOGIA_PADRAO.nome_ovelha }))}
            placeholder="Ex: Discípulo, Acompanhado, Membro"
          />
          <Input
            label="Nome do responsável pastoral"
            value={terminologia.nome_pastor}
            onChange={(e) => setTerminologia((t) => ({ ...t, nome_pastor: e.target.value || TERMINOLOGIA_PADRAO.nome_pastor }))}
            placeholder="Ex: Formador, Líder, Discipulador"
          />
        </div>
      </div>

      <Button type="submit" loading={salvando}>
        Salvar alterações
      </Button>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-text-secondary">Tipos de evento</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          Usados no registro de presença da Pastoral. Adicione os que sua comunidade usa, além dos padrões.
        </p>
        {tiposEvento.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tiposEvento.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-primary"
              >
                {t.nome}
                <button type="button" onClick={() => handleRemoverTipoEvento(t)} className="text-text-secondary hover:text-danger">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <Input
              placeholder="Ex: Grupo de oração"
              value={novoTipoEvento}
              onChange={(e) => setNovoTipoEvento(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdicionarTipoEvento();
                }
              }}
            />
          </div>
          <Button type="button" variant="secondary" size="md" icon={Plus} loading={salvandoTipo} onClick={handleAdicionarTipoEvento}>
            Adicionar
          </Button>
        </div>
      </div>
    </form>
  );
}
