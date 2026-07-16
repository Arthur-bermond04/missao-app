'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { PainelHeader } from '../../components/PainelHeader';
import { enviarMensagem, listarMensagens } from '../../lib/mensagens';
import type { Canal, MensagemEnviada } from '../../types/database';

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
];

export default function MensagensPage() {
  const { session, usuario, carregando } = useSession();
  const router = useRouter();

  const [historico, setHistorico] = useState<MensagemEnviada[]>([]);
  const [canal, setCanal] = useState<Canal>('push');
  const [destinatarios, setDestinatarios] = useState('todos');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [agendarEm, setAgendarEm] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState('');

  useEffect(() => {
    if (!carregando && !session) router.replace('/login');
  }, [carregando, session, router]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    listarMensagens(usuario.comunidade_id).then(setHistorico);
  }, [usuario?.comunidade_id]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario?.comunidade_id) return;
    setEnviando(true);
    setMensagemStatus('');
    try {
      const nova = await enviarMensagem({
        comunidade_id: usuario.comunidade_id,
        remetente_id: usuario.id,
        canal,
        destinatarios,
        titulo: titulo.trim() || undefined,
        corpo: corpo.trim(),
        enviarEm: agendarEm ? new Date(agendarEm).toISOString() : undefined,
      });
      setHistorico((atual) => [nova, ...atual]);
      setTitulo('');
      setCorpo('');
      setAgendarEm('');
      setMensagemStatus(
        agendarEm
          ? 'Mensagem agendada e registrada.'
          : 'Mensagem registrada. O disparo real depende de configurar as integrações (FCM/Z-API/Resend).'
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando || !session) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-[--color-primary-light] px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <PainelHeader titulo="Comunicação" nomeUsuario={usuario?.nome} />

        <form onSubmit={handleEnviar} className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-700">Nova mensagem</h2>

          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500">Canal</label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as Canal)}
                className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                {CANAIS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500">Destinatários</label>
              <select
                value={destinatarios}
                onChange={(e) => setDestinatarios(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                {DESTINATARIOS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500">Agendar para (opcional)</label>
              <input
                type="datetime-local"
                value={agendarEm}
                onChange={(e) => setAgendarEm(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <label className="mt-4 block text-xs font-semibold text-zinc-500">Título</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Ex: Encontro de missionários"
          />

          <label className="mt-4 block text-xs font-semibold text-zinc-500">Mensagem</label>
          <textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            required
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />

          {!!mensagemStatus && <p className="mt-3 text-sm text-[--color-success]">{mensagemStatus}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="mt-4 rounded-lg bg-[--color-primary] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : agendarEm ? 'Agendar mensagem' : 'Enviar agora'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-700">Histórico</h2>
          {historico.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Nenhuma mensagem enviada ainda.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {historico.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-zinc-700">{m.titulo || m.corpo.slice(0, 40)}</span>
                    <span className="text-xs text-zinc-400">
                      {m.enviado_em ? new Date(m.enviado_em).toLocaleString('pt-BR') : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {m.canal} · {m.destinatarios} · {m.total_enviados} destinatário(s)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
