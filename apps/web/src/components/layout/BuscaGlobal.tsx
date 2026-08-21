'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { buscaGlobal, LABEL_SECAO, type ResultadoBusca, type TipoResultadoBusca } from '@/lib/busca';
import { montarNavGrupos } from '@/lib/navegacao';
import { useTerminologia } from '@/lib/terminologia';

const ORDEM_SECOES: TipoResultadoBusca[] = ['pessoa', 'contato', 'ovelha', 'membro', 'retiro', 'ministerio', 'financeiro'];

interface ResultadoTela {
  tipo: 'tela';
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
}

export function BuscaGlobal({
  open,
  onClose,
  comunidadeId,
}: {
  open: boolean;
  onClose: () => void;
  comunidadeId: string;
}) {
  const router = useRouter();
  const terminologia = useTerminologia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  useEffect(() => {
    if (open) {
      setTermo('');
      setResultados([]);
      setIndiceAtivo(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setBuscando(true);
      buscaGlobal(comunidadeId, termo)
        .then((r) => {
          setResultados(r);
          setIndiceAtivo(0);
        })
        .finally(() => setBuscando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [termo, comunidadeId, open]);

  // Índice de telas — síncrono, sem rede: casa o termo contra grupo, rótulo e
  // descrição de cada item do menu (o mesmo campo `descricao` adicionado à
  // navegação). Aparece antes dos resultados de dado, como "Grupo › Tela" no
  // Athenas, porque não depende de round-trip nenhum.
  const resultadosTela = useMemo<ResultadoTela[]>(() => {
    const q = termo.trim().toLowerCase();
    if (q.length < 2) return [];
    const grupos = montarNavGrupos(terminologia);
    const itens: ResultadoTela[] = [];
    for (const grupo of grupos) {
      for (const item of grupo.itens) {
        const alvo = `${grupo.titulo} ${item.label} ${item.descricao}`.toLowerCase();
        if (!alvo.includes(q)) continue;
        itens.push({
          tipo: 'tela',
          id: item.href,
          titulo: item.label,
          subtitulo: `${grupo.titulo} › ${item.label}`,
          href: item.href,
        });
      }
    }
    return itens;
  }, [termo, terminologia]);

  const secoes = useMemo(() => {
    return ORDEM_SECOES.map((tipo) => ({ tipo, itens: resultados.filter((r) => r.tipo === tipo) })).filter(
      (s) => s.itens.length > 0
    );
  }, [resultados]);

  const listaAchatada = useMemo(
    () => [...resultadosTela, ...secoes.flatMap((s) => s.itens)],
    [resultadosTela, secoes]
  );

  function abrirResultado(r: ResultadoBusca | ResultadoTela) {
    router.push(r.href);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.min(i + 1, listaAchatada.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const alvo = listaAchatada[indiceAtivo];
      if (alvo) abrirResultado(alvo);
    }
  }

  if (!open || typeof document === 'undefined') return null;

  let indiceGlobal = -1;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg bg-bg-card shadow-hover"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={18} className="text-text-secondary" />
          <input
            ref={inputRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar pessoas, ovelhas, retiros, financeiro..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
          />
          <button onClick={onClose} className="rounded-md p-1 text-text-secondary hover:bg-bg-page">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {termo.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-text-secondary">Digite ao menos 2 letras para buscar.</p>
          ) : (
            <>
              {/* Telas casam na hora, sem round-trip — aparecem mesmo enquanto a
                  busca por dado ainda está em voo. */}
              {resultadosTela.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-text-secondary">Telas</p>
                  {resultadosTela.map((item) => {
                    indiceGlobal += 1;
                    const ativo = indiceGlobal === indiceAtivo;
                    return (
                      <button
                        key={`tela-${item.id}`}
                        onClick={() => abrirResultado(item)}
                        onMouseEnter={() => setIndiceAtivo(indiceGlobal)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                          ativo ? 'bg-primary-xlight text-primary' : 'text-text-primary hover:bg-bg-page'
                        }`}
                      >
                        <span className="font-medium">{item.titulo}</span>
                        <span className="text-xs text-text-secondary">{item.subtitulo}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {buscando ? (
                <p className="px-3 py-6 text-center text-sm text-text-secondary">Buscando...</p>
              ) : listaAchatada.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-text-secondary">
                  Nenhum resultado para &ldquo;{termo}&rdquo;.
                </p>
              ) : (
                secoes.map((secao) => (
                  <div key={secao.tipo} className="mb-2">
                    <p className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-text-secondary">
                      {LABEL_SECAO[secao.tipo]}
                    </p>
                    {secao.itens.map((item) => {
                      indiceGlobal += 1;
                      const ativo = indiceGlobal === indiceAtivo;
                      return (
                        <button
                          key={`${item.tipo}-${item.id}`}
                          onClick={() => abrirResultado(item)}
                          onMouseEnter={() => setIndiceAtivo(indiceGlobal)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                            ativo ? 'bg-primary-xlight text-primary' : 'text-text-primary hover:bg-bg-page'
                          }`}
                        >
                          <span className="font-medium">{item.titulo}</span>
                          {!!item.subtitulo && <span className="text-xs text-text-secondary">{item.subtitulo}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-xs text-text-secondary">
          ↑↓ navegar · Enter abrir · Esc fechar
        </div>
      </div>
    </div>,
    document.body
  );
}
