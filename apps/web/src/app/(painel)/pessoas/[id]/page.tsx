'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, IdCard, Phone, Mail, MapPin } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EtapaJornadaBadge } from '@/components/pessoas/EtapaJornadaBadge';
import { AbaResumo } from '@/components/pessoas/AbaResumo';
import { AbaInteracoes } from '@/components/pessoas/AbaInteracoes';
import { AbaDadosPessoais } from '@/components/pessoas/AbaDadosPessoais';
import { AbaHistorico } from '@/components/pessoas/AbaHistorico';
import { arquivarPessoa, buscarPessoa, listarInteracoes, listarRetirosDaPessoa } from '@/lib/pessoas';
import { buscarOvelhaPorPessoa } from '@/lib/pastoral';
import { listarMinisteriosDaPessoa } from '@/lib/ministerios';
import { registrarAcessoRecente } from '@/lib/recentes';
import { toastSuccess } from '@/lib/toast';
import type { Ministerio, PastoralOvelha, Pessoa, PessoaInteracao, PessoaRetiro, Usuario } from '@/types/database';

type Aba = 'resumo' | 'interacoes' | 'dados' | 'historico';

export default function PerfilPessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { usuario } = usePainelSession();
  const router = useRouter();

  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [interacoes, setInteracoes] = useState<PessoaInteracao[]>([]);
  const [retiros, setRetiros] = useState<PessoaRetiro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ovelha, setOvelha] = useState<PastoralOvelha | null>(null);
  const [ministeriosDaPessoa, setMinisteriosDaPessoa] = useState<Ministerio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>('resumo');

  const carregar = useCallback(() => {
    setCarregando(true);
    Promise.all([
      buscarPessoa(id),
      listarInteracoes(id),
      listarRetirosDaPessoa(id),
      buscarOvelhaPorPessoa(id),
      listarMinisteriosDaPessoa(id),
    ])
      .then(([p, i, r, o, m]) => {
        setPessoa(p);
        setInteracoes(i);
        setRetiros(r);
        setOvelha(o);
        setMinisteriosDaPessoa(m);
        if (p) registrarAcessoRecente({ tipo: 'pessoa', id: p.id, titulo: p.nome, href: `/pessoas/${p.id}` });
      })
      .finally(() => setCarregando(false));
  }, [id]);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    supabase
      .from('usuarios')
      .select('*')
      .eq('comunidade_id', usuario.comunidade_id)
      .order('nome', { ascending: true })
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
  }, [usuario?.comunidade_id]);

  async function handleArquivar() {
    if (!pessoa) return;
    if (!confirm(`Arquivar ${pessoa.nome}? A pessoa deixará de aparecer na lista, mas o histórico é mantido.`)) return;
    await arquivarPessoa(pessoa.id);
    toastSuccess('Pessoa arquivada.');
    router.push('/pessoas');
  }

  if (carregando) {
    return <p className="text-sm text-text-secondary">Carregando...</p>;
  }
  if (!pessoa) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-text-secondary">Pessoa não encontrada ou sem acesso.</p>
        <Link href="/pessoas" className="mt-2 inline-block text-sm text-primary">
          Voltar
        </Link>
      </div>
    );
  }

  const ABAS: { valor: Aba; label: string }[] = [
    { valor: 'resumo', label: 'Resumo' },
    { valor: 'interacoes', label: 'Interações' },
    { valor: 'dados', label: 'Dados pessoais' },
    { valor: 'historico', label: 'Histórico' },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/pessoas" className="mb-3 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <PageHeader
        icon={IdCard}
        title={pessoa.nome}
        subtitle="Cadastro central de pessoas"
        actions={
          <Button variant="secondary" icon={Archive} onClick={handleArquivar}>
            Arquivar
          </Button>
        }
      />

      {/* Header info */}
      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-xlight text-lg font-bold text-primary-dark">
            {pessoa.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pessoa.foto_url} alt={pessoa.nome} className="h-full w-full object-cover" />
            ) : (
              pessoa.nome.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">{pessoa.nome}</h2>
              <EtapaJornadaBadge etapa={pessoa.etapa_jornada} />
              <Badge variant={pessoa.nivel_interesse} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              {!!pessoa.telefone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} /> {pessoa.telefone}
                </span>
              )}
              {!!pessoa.email && (
                <span className="flex items-center gap-1">
                  <Mail size={13} /> {pessoa.email}
                </span>
              )}
              {!!pessoa.cidade && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} /> {pessoa.cidade}
                  {pessoa.bairro ? ` · ${pessoa.bairro}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            onClick={() => setAba(a.valor)}
            className={`flex items-center gap-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === a.valor
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-bg-card p-6 shadow-card">
        {aba === 'resumo' && (
          <AbaResumo pessoa={pessoa} onAtualizada={setPessoa} ovelha={ovelha} ministerios={ministeriosDaPessoa} />
        )}
        {aba === 'interacoes' && usuario && (
          <AbaInteracoes pessoaId={pessoa.id} usuarioId={usuario.id} interacoes={interacoes} onRefresh={carregar} />
        )}
        {aba === 'dados' && <AbaDadosPessoais pessoa={pessoa} usuarios={usuarios} onAtualizada={setPessoa} />}
        {aba === 'historico' && <AbaHistorico pessoaId={pessoa.id} retiros={retiros} onRefresh={carregar} />}
      </div>
    </div>
  );
}
