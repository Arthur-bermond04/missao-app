'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Route,
  Search,
  Target,
  UserCircle2,
} from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { useTerminologia } from '@/lib/terminologia';
import { FUNCOES_TRILHA, PERGUNTAS_FREQUENTES, montarGlossario, montarGuia, type GuiaSecao } from '@/lib/guia';
import { Diagrama } from '@/components/guia/Diagramas';
import { MatrizAoVivo } from '@/components/guia/MatrizAoVivo';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { Perfil, Terminologia } from '@/types/database';

// Função escolhida e progresso ficam só no navegador de cada pessoa
// (localStorage), por usuário: é conveniência de leitura, não dado de negócio.
const chaveProgresso = (usuarioId: string) => `guia-concluidos:${usuarioId}`;
const chaveFuncao = (usuarioId: string) => `guia-funcao:${usuarioId}`;

function lerProgresso(usuarioId: string): Set<string> {
  try {
    const bruto = window.localStorage.getItem(chaveProgresso(usuarioId));
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return new Set(Array.isArray(lista) ? lista.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function salvarProgresso(usuarioId: string, concluidos: Set<string>) {
  try {
    window.localStorage.setItem(chaveProgresso(usuarioId), JSON.stringify([...concluidos]));
  } catch {
    // sem localStorage (janela privada, bloqueio): o guia funciona, só não lembra.
  }
}

function lerFuncao(usuarioId: string): Perfil | null {
  try {
    const v = window.localStorage.getItem(chaveFuncao(usuarioId));
    return FUNCOES_TRILHA.some((f) => f.perfil === v) ? (v as Perfil) : null;
  } catch {
    return null;
  }
}

function salvarFuncao(usuarioId: string, perfil: Perfil) {
  try {
    window.localStorage.setItem(chaveFuncao(usuarioId), perfil);
  } catch {
    // idem
  }
}

function SecaoGuia({
  secao,
  concluida,
  onAlternar,
  etiqueta,
  destaque,
  todas,
  terminologia,
  onIrPara,
}: {
  secao: GuiaSecao;
  concluida: boolean;
  onAlternar: () => void;
  etiqueta?: string;
  destaque?: boolean;
  todas: GuiaSecao[];
  terminologia: Terminologia;
  onIrPara: (id: string) => void;
}) {
  const Icon = secao.icon;
  const relacionados = secao.relacionados
    .map((id) => todas.find((s) => s.id === id))
    .filter((s): s is GuiaSecao => !!s);
  return (
    <section id={secao.id} className="scroll-mt-24">
      <Card padding="md" className={destaque ? 'ring-2 ring-accent-green' : ''}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-xlight text-primary">
              <Icon size={20} />
            </div>
            <div>
              {!!etiqueta && (
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{etiqueta}</p>
              )}
              <h2 className="text-lg font-semibold text-text-primary">{secao.titulo}</h2>
              <p className="text-sm text-text-secondary">{secao.resumo}</p>
            </div>
          </div>
          {concluida ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-xlight px-2.5 py-1 text-xs font-medium text-primary">
              <CheckCircle2 size={14} /> Concluído
            </span>
          ) : (
            destaque && (
              <span className="rounded-full bg-accent-green px-2.5 py-1 text-xs font-medium text-white">Próximo passo</span>
            )
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Clock size={14} /> {secao.tempo}
          </span>
          <span>
            <strong className="font-semibold text-text-primary">Quem usa:</strong> {secao.paraQuemE}
          </span>
        </div>

        {secao.diagrama && <Diagrama id={secao.diagrama} t={terminologia} />}
        {secao.extra === 'matriz' && <MatrizAoVivo />}

        {secao.antes.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <ListChecks size={14} /> Antes de começar
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {secao.antes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">Passo a passo</p>
        <ol className="mt-2 space-y-3">
          {secao.passos.map((passo, i) => (
            <li key={passo.titulo} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">{passo.titulo}</p>
                <p className="text-sm text-text-secondary">{passo.texto}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex gap-2 rounded-md bg-primary-xlight p-3 text-sm text-primary-dark">
          <Target size={16} className="mt-0.5 shrink-0" />
          <p>
            <strong className="font-semibold">Resultado esperado:</strong> {secao.resultado}
          </p>
        </div>

        {secao.erros.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <AlertTriangle size={14} /> Se algo der errado
            </p>
            <dl className="mt-1.5 space-y-2">
              {secao.erros.map((e) => (
                <div key={e.problema} className="rounded-md border border-border p-3">
                  <dt className="text-sm font-medium text-text-primary">{e.problema}</dt>
                  <dd className="mt-0.5 text-sm text-text-secondary">{e.solucao}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {secao.dicas.length > 0 && (
          <div className="mt-4 rounded-md bg-bg-page p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <Lightbulb size={14} /> Dicas
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {secao.dicas.map((dica) => (
                <li key={dica}>{dica}</li>
              ))}
            </ul>
          </div>
        )}

        {relacionados.length > 0 && (
          <p className="mt-4 text-sm text-text-secondary">
            Continue lendo:{' '}
            {relacionados.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ', '}
                <button
                  type="button"
                  onClick={() => onIrPara(r.id)}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {r.titulo}
                </button>
              </span>
            ))}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {secao.href && (
            <Link
              href={secao.href}
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-[9px] text-sm font-medium text-white shadow-[0_1px_3px_rgba(22,163,74,0.3)] transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2"
            >
              Abrir {secao.titulo} <ArrowRight size={16} />
            </Link>
          )}
          <Button variant="secondary" icon={Check} onClick={onAlternar}>
            {concluida ? 'Desmarcar como concluído' : 'Marcar como concluído'}
          </Button>
        </div>
      </Card>
    </section>
  );
}

type Aba = 'trilha' | 'todos' | 'glossario' | 'faq';

export default function GuiaPage() {
  const { usuario, pode } = usePainelSession();
  const terminologia = useTerminologia();
  const [busca, setBusca] = useState('');
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());
  const [funcao, setFuncao] = useState<Perfil | null>(null);
  const [aba, setAba] = useState<Aba>('trilha');
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [irPara, setIrPara] = useState<string | null>(null);

  const usuarioId = usuario?.id;

  useEffect(() => {
    if (!usuarioId) return;
    setConcluidos(lerProgresso(usuarioId));
    setFuncao(lerFuncao(usuarioId));
  }, [usuarioId]);

  // Só entram os tutoriais dos módulos que o perfil logado pode ver.
  const secoesVisiveis = useMemo(
    () => montarGuia(terminologia).filter((s) => !s.modulo || pode(s.modulo, 'ver')),
    [terminologia, pode]
  );

  const funcaoAtual = FUNCOES_TRILHA.find((f) => f.perfil === funcao) ?? null;

  // A trilha segue a ordem da função, mas só com o que o perfil logado enxerga.
  const trilha = useMemo(() => {
    if (!funcaoAtual) return [];
    const porId = new Map(secoesVisiveis.map((s) => [s.id, s]));
    return funcaoAtual.secoes.map((id) => porId.get(id)).filter((s): s is GuiaSecao => !!s);
  }, [funcaoAtual, secoesVisiveis]);

  const proximoId = trilha.find((s) => !concluidos.has(s.id))?.id;
  const feitosTrilha = trilha.filter((s) => concluidos.has(s.id)).length;
  const percentualTrilha = trilha.length ? Math.round((feitosTrilha / trilha.length) * 100) : 0;

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return secoesVisiveis;
    return secoesVisiveis.filter((s) =>
      [s.titulo, s.resumo, s.paraQuemE, ...s.passos.flatMap((p) => [p.titulo, p.texto]), ...s.dicas]
        .join(' ')
        .toLowerCase()
        .includes(termo)
    );
  }, [busca, secoesVisiveis]);

  const totalConcluidos = secoesVisiveis.filter((s) => concluidos.has(s.id)).length;
  const percentualGeral = secoesVisiveis.length ? Math.round((totalConcluidos / secoesVisiveis.length) * 100) : 0;

  function alternar(id: string) {
    if (!usuarioId) return;
    setConcluidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      salvarProgresso(usuarioId, novo);
      return novo;
    });
  }

  // Abre a lista completa, limpa a busca e rola até a seção pedida depois que ela existir na tela.
  function abrirSecao(id: string) {
    setBusca('');
    setAba('todos');
    setIrPara(id);
  }

  useEffect(() => {
    if (!irPara || aba !== 'todos') return;
    const el = document.getElementById(irPara);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIrPara(null);
  }, [irPara, aba, busca]);

  const glossario = useMemo(() => montarGlossario(terminologia), [terminologia]);

  function escolherFuncao(perfil: Perfil) {
    if (usuarioId) salvarFuncao(usuarioId, perfil);
    setFuncao(perfil);
    setAba('trilha');
    setSeletorAberto(false);
  }

  const abaBtn = (valor: Aba, label: string, Icon: typeof Route) => (
    <button
      type="button"
      onClick={() => setAba(valor)}
      aria-pressed={aba === valor}
      className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green ${
        aba === valor ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Guia"
        subtitle="Passo a passo para conhecer cada parte do MissãoApp"
        actions={
          <Button variant="secondary" icon={UserCircle2} onClick={() => setSeletorAberto(true)}>
            {funcaoAtual ? `Função: ${funcaoAtual.titulo}` : 'Função'}
          </Button>
        }
      />

      <Modal
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        title="Qual é a sua função?"
        description="A função define a ordem do guia: você começa pelo que importa para o seu trabalho. Dá para trocar depois."
        size="lg"
      >
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {FUNCOES_TRILHA.map((f) => (
            <li key={f.perfil}>
              <button
                type="button"
                onClick={() => escolherFuncao(f.perfil)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-green"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {f.titulo}
                    {f.perfil === funcao && <span className="ml-2 text-xs font-medium text-primary">atual</span>}
                  </p>
                  <p className="text-sm text-text-secondary">{f.descricao}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-text-secondary" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      <div className="mt-6 flex gap-1 border-b border-border">
        {abaBtn('trilha', 'Minha trilha', Route)}
        {abaBtn('todos', 'Todos os módulos', BookOpen)}
        {abaBtn('glossario', 'Glossário', ListChecks)}
        {abaBtn('faq', 'Problemas comuns', HelpCircle)}
      </div>

      {aba === 'trilha' && (
        <div className="mt-6 space-y-5">
          {!funcaoAtual ? (
            <Card padding="md">
              <div className="flex items-center gap-2">
                <Route size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">Minha trilha de aprendizado</h2>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                Escolha a sua função e o guia monta a sua trilha: um passo por vez, só com o que você usa.
              </p>
              <Button className="mt-4" icon={UserCircle2} onClick={() => setSeletorAberto(true)}>
                Escolher a função
              </Button>
            </Card>
          ) : (
            <>
              <Card padding="md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">Trilha de {funcaoAtual.titulo}</h2>
                    <p className="text-sm text-text-secondary">{funcaoAtual.descricao}</p>
                  </div>
                  <span className="text-sm text-text-secondary">
                    {feitosTrilha} de {trilha.length} passos
                  </span>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-bg-page"
                  role="progressbar"
                  aria-valuenow={percentualTrilha}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso na trilha"
                >
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentualTrilha}%` }} />
                </div>
                {funcaoAtual.perfil !== usuario?.perfil && (
                  <p className="mt-3 text-xs text-text-secondary">
                    Seu acesso real é de {usuario?.perfil}. A trilha mostra só os módulos que o seu perfil consegue abrir.
                  </p>
                )}
                {trilha.length > 0 && feitosTrilha === trilha.length && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <CheckCircle2 size={16} /> Trilha concluída. Você já conhece tudo da sua função.
                  </p>
                )}
              </Card>

              {trilha.length === 0 ? (
                <EmptyState
                  icon={Route}
                  title="Nenhum passo disponível"
                  description="O seu perfil não tem acesso aos módulos desta trilha."
                />
              ) : (
                trilha.map((s, i) => (
                  <SecaoGuia
                    key={s.id}
                    secao={s}
                    concluida={concluidos.has(s.id)}
                    onAlternar={() => alternar(s.id)}
                    todas={secoesVisiveis}
                    terminologia={terminologia}
                    onIrPara={abrirSecao}
                    etiqueta={`Passo ${i + 1} de ${trilha.length}`}
                    destaque={s.id === proximoId}
                  />
                ))
              )}
            </>
          )}
        </div>
      )}

      {aba === 'todos' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card padding="sm">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar no guia"
                  aria-label="Buscar no guia"
                  className="w-full rounded-md border border-border bg-bg-card py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Seu progresso</span>
                  <span>
                    {totalConcluidos} de {secoesVisiveis.length}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-page"
                  role="progressbar"
                  aria-valuenow={percentualGeral}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso no guia"
                >
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentualGeral}%` }} />
                </div>
              </div>

              <nav className="mt-4 max-h-[50vh] space-y-0.5 overflow-y-auto" aria-label="Índice do guia">
                {filtradas.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-primary transition-colors hover:bg-bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                    >
                      <Icon size={16} className="shrink-0 text-text-secondary" />
                      <span className="flex-1 truncate">{s.titulo}</span>
                      {concluidos.has(s.id) && (
                        <CheckCircle2 size={14} className="shrink-0 text-primary" aria-label="Concluído" />
                      )}
                    </a>
                  );
                })}
              </nav>
            </Card>
          </aside>

          <div className="space-y-5">
            {filtradas.length === 0 ? (
              <EmptyState icon={Search} title="Nada encontrado" description="Tente outra palavra, como o nome de um módulo." />
            ) : (
              filtradas.map((s) => (
                <SecaoGuia
                  key={s.id}
                  secao={s}
                  concluida={concluidos.has(s.id)}
                  onAlternar={() => alternar(s.id)}
                  todas={secoesVisiveis}
                  terminologia={terminologia}
                  onIrPara={abrirSecao}
                />
              ))
            )}
          </div>
        </div>
      )}

      {aba === 'glossario' && (
        <Card padding="md" className="mt-6">
          <h2 className="text-lg font-semibold text-text-primary">Glossário</h2>
          <p className="text-sm text-text-secondary">Os termos do sistema, com os nomes que a sua comunidade usa.</p>
          <dl className="mt-4 divide-y divide-border">
            {glossario.map((g) => (
              <div key={g.termo} className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
                <dt className="text-sm font-semibold text-text-primary">{g.termo}</dt>
                <dd className="text-sm text-text-secondary">{g.definicao}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {aba === 'faq' && (
        <Card padding="md" className="mt-6">
          <h2 className="text-lg font-semibold text-text-primary">Problemas comuns</h2>
          <p className="text-sm text-text-secondary">As dúvidas que mais aparecem, com a causa provável e o que fazer.</p>
          <div className="mt-4 space-y-2">
            {PERGUNTAS_FREQUENTES.map((f) => (
              <details key={f.pergunta} className="group rounded-md border border-border p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-text-primary">
                  {f.pergunta}
                  <ChevronRight size={16} className="shrink-0 text-text-secondary transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-2 text-sm text-text-secondary">{f.resposta}</p>
              </details>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
