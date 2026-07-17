'use client';

import { use, useEffect, useState } from 'react';

type RetiroPublico = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  local: string | null;
  vagas: number | null;
  valor: number | null;
  status: string;
};

export default function InscricaoPage({ params }: { params: Promise<{ retiroId: string }> }) {
  const { retiroId } = use(params);
  const [retiro, setRetiro] = useState<RetiroPublico | null>(null);
  const [erroCarregar, setErroCarregar] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch(`/api/retiros/${retiroId}/publico`)
      .then((r) => r.json())
      .then((data) => {
        if (data.erro) setErroCarregar(data.erro);
        else setRetiro(data);
      })
      .catch(() => setErroCarregar('Não foi possível carregar as informações do retiro.'));
  }, [retiroId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const resposta = await fetch('/api/inscricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retiro_id: retiroId, nome, telefone }),
      });
      const data = await resposta.json();
      if (!resposta.ok) throw new Error(data.erro ?? 'Erro ao enviar inscrição.');
      setConcluido(true);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar inscrição.');
    } finally {
      setEnviando(false);
    }
  }

  if (erroCarregar) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-zinc-500">
        {erroCarregar}
      </div>
    );
  }

  if (!retiro) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">Carregando...</div>;
  }

  if (concluido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[--color-primary-xlight] px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-extrabold text-[--color-success]">Inscrição confirmada! 🎉</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {nome}, sua inscrição para <strong>{retiro.nome}</strong> foi registrada. Em breve a
            organização entrará em contato com mais detalhes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-primary-xlight] px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-extrabold text-[--color-primary]">{retiro.nome}</h1>
        <p className="mt-1 text-center text-sm text-zinc-500">
          {new Date(retiro.data_inicio).toLocaleDateString('pt-BR')} a{' '}
          {new Date(retiro.data_fim).toLocaleDateString('pt-BR')}
          {retiro.local ? ` · ${retiro.local}` : ''}
        </p>
        {!!retiro.valor && (
          <p className="mt-1 text-center text-sm font-semibold text-zinc-700">
            R$ {retiro.valor.toFixed(2)}
          </p>
        )}

        <label className="mt-6 block text-xs font-semibold text-zinc-500">Seu nome</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[--color-primary]"
        />

        <label className="mt-4 block text-xs font-semibold text-zinc-500">WhatsApp</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(00) 00000-0000"
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[--color-primary]"
        />

        {!!erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 w-full rounded-xl bg-[--color-primary] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {enviando ? 'Enviando...' : 'Confirmar inscrição'}
        </button>
      </form>
    </div>
  );
}
