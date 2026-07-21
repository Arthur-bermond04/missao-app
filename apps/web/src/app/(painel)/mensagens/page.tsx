'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, CircleCheck, CircleAlert, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { TemplateDropdown } from '@/components/mensagens/TemplateDropdown';
import { PreviaMensagem } from '@/components/mensagens/PreviaMensagem';
import { HistoricoCard } from '@/components/mensagens/HistoricoCard';
import { enviarMensagem, listarMensagens } from '@/lib/mensagens';
import { listarTemplates } from '@/lib/mensagensTemplates';
import { listarMinisterios, type MinisterioComContagem } from '@/lib/ministerios';
import { buscarStatusIntegracoes, type StatusIntegracoes } from '@/lib/integracoes';
import { toastSuccess, toastError } from '@/lib/toast';
import type { Canal, MensagemEnviada, MensagemTemplate, RecorrenciaMensagem } from '@/types/database';

const CANAIS: { valor: Canal; label: string }[] = [
  { valor: 'push', label: 'Notificação push' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'sms', label: 'SMS' },
];

const DESTINATARIOS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'missionarios', label: 'Missionários' },
  { valor: 'lideres', label: 'Líderes e coordenadores' },
  { valor: 'ministerio', label: 'Membros de um ministério...' },
];

const LIMITE_CARACTERES_WHATSAPP = 1024;

export default function MensagensPage() {
  const { usuario } = usePainelSession();

  const [historico, setHistorico] = useState<MensagemEnviada[]>([]);
  const [templates, setTemplates] = useState<MensagemTemplate[]>([]);
  const [ministerios, setMinisterios] = useState<MinisterioComContagem[]>([]);
  const [statusIntegracoes, setStatusIntegracoes] = useState<StatusIntegracoes | null>(null);
  const [canal, setCanal] = useState<Canal>('push');
  const [destinatarios, setDestinatarios] = useState('todos');
  const [ministerioId, setMinisterioId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [agendarEm, setAgendarEm] = useState('');
  const [recorrencia, setRecorrencia] = useState<'' | RecorrenciaMensagem>('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    listarMensagens(usuario.comunidade_id).then(setHistorico);
    listarTemplates(usuario.comunidade_id)
      .then(setTemplates)
      .catch(() => setTemplates([]));
    listarMinisterios(usuario.comunidade_id).then(setMinisterios);
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    buscarStatusIntegracoes().then(setStatusIntegracoes);
  }, []);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario?.comunidade_id) return;
    if (destinatarios === 'ministerio' && !ministerioId) {
      toastError('Selecione o ministério.');
      return;
    }
    setEnviando(true);
    try {
      const nova = await enviarMensagem({
        comunidade_id: usuario.comunidade_id,
        remetente_id: usuario.id,
        canal,
        destinatarios: destinatarios === 'ministerio' ? `ministerio:${ministerioId}` : destinatarios,
        titulo: titulo.trim() || undefined,
        corpo: corpo.trim(),
        enviarEm: agendarEm ? new Date(agendarEm).toISOString() : undefined,
        recorrencia: recorrencia || undefined,
      });
      setHistorico((atual) => [nova, ...atual]);
      setTitulo('');
      setCorpo('');
      setAgendarEm('');
      setRecorrencia('');
      toastSuccess(
        agendarEm
          ? 'Mensagem agendada e registrada.'
          : 'Mensagem registrada. O disparo real depende de configurar as integrações (FCM/Z-API/Resend).'
      );
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader icon={MessageCircle} title="Comunicação" subtitle="Envie avisos para a equipe" />

      {statusIntegracoes && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg bg-bg-card p-4 shadow-card text-sm">
          {[
            { label: 'Push (FCM)', ativo: statusIntegracoes.push },
            { label: 'WhatsApp (Z-API)', ativo: statusIntegracoes.whatsapp },
            { label: 'E-mail (Resend)', ativo: statusIntegracoes.email },
          ].map((i) => (
            <span key={i.label} className={`inline-flex items-center gap-1 font-medium ${i.ativo ? 'text-accent' : 'text-text-secondary'}`}>
              {i.ativo ? <CircleCheck size={14} /> : <CircleAlert size={14} />}
              {i.label}: {i.ativo ? 'Ativo' : 'Não configurado'}
            </span>
          ))}
          {!statusIntegracoes.push && !statusIntegracoes.whatsapp && !statusIntegracoes.email && (
            <Link href="/configuracoes" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
              Configurar <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-bold text-text-primary">Nova mensagem</h2>
          {!!usuario?.comunidade_id && (
            <TemplateDropdown
              templates={templates}
              comunidadeId={usuario.comunidade_id}
              tituloAtual={titulo}
              corpoAtual={corpo}
              onUsarTemplate={(t) => {
                setTitulo(t.titulo ?? '');
                setCorpo(t.corpo);
              }}
              onTemplateCriado={(t) => setTemplates((atual) => [...atual, t])}
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          <form onSubmit={handleEnviar}>
            <div className="flex flex-wrap gap-4">
              <Select
                label="Canal"
                value={canal}
                onChange={(e) => setCanal(e.target.value as Canal)}
                options={CANAIS.map((c) => ({ value: c.valor, label: c.label }))}
              />
              <Select
                label="Destinatários"
                value={destinatarios}
                onChange={(e) => setDestinatarios(e.target.value)}
                options={DESTINATARIOS.map((d) => ({ value: d.valor, label: d.label }))}
              />
              {destinatarios === 'ministerio' && (
                <Select
                  label="Qual ministério"
                  value={ministerioId}
                  onChange={(e) => setMinisterioId(e.target.value)}
                  options={[{ value: '', label: 'Selecione...' }, ...ministerios.map((m) => ({ value: m.id, label: m.nome }))]}
                />
              )}
              <Input
                label="Agendar para (opcional)"
                type="datetime-local"
                value={agendarEm}
                onChange={(e) => setAgendarEm(e.target.value)}
              />
              <Select
                label="Repetir"
                value={recorrencia}
                onChange={(e) => setRecorrencia(e.target.value as '' | RecorrenciaMensagem)}
                options={[
                  { value: '', label: 'Não repetir' },
                  { value: 'semanal', label: 'Semanal' },
                  { value: 'mensal', label: 'Mensal' },
                ]}
              />
            </div>

            <div className="mt-4">
              <Input
                label="Título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Encontro de missionários"
              />
            </div>

            <div className="mt-4">
              <Textarea label="Mensagem" value={corpo} onChange={(e) => setCorpo(e.target.value)} required rows={5} />
              {canal === 'whatsapp' && (
                <p
                  className={`mt-1 text-right text-xs ${
                    corpo.length > LIMITE_CARACTERES_WHATSAPP ? 'font-semibold text-danger' : 'text-text-secondary'
                  }`}
                >
                  {corpo.length} / {LIMITE_CARACTERES_WHATSAPP} caracteres
                </p>
              )}
            </div>

            <Button type="submit" loading={enviando} className="mt-4">
              {enviando ? 'Enviando...' : agendarEm ? 'Agendar mensagem' : 'Enviar agora'}
            </Button>
          </form>

          <PreviaMensagem canal={canal} titulo={titulo} corpo={corpo} />
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <h2 className="text-sm font-bold text-text-primary">Histórico</h2>
        {historico.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma mensagem enviada ainda"
            description="Envie o primeiro aviso para sua equipe usando o formulário acima."
          />
        ) : (
          <div className="mt-3 space-y-2">
            {historico.map((m) => (
              <HistoricoCard key={m.id} mensagem={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
