'use client';

import { useState } from 'react';
import { Check, Lock, Palette, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { Button } from '@/components/ui/Button';
import {
  aplicarCorDestaque,
  COR_DESTAQUE_PADRAO,
  corDoTexto,
  filtroDoLogo,
  hexValido,
  PRESETS_COR,
  salvarCorDestaque,
} from '@/lib/aparencia';
import { toastError, toastSuccess } from '@/lib/toast';

/**
 * Cor de destaque da marca. Só quem tem a permissão "Aparência › editar" (por
 * padrão, só admin) altera; os demais veem a cor atual em modo leitura.
 */
export function AbaAparencia({
  comunidadeId,
  corSalva,
  onSalva,
}: {
  comunidadeId: string;
  corSalva: string | null;
  onSalva: (cor: string | null) => void;
}) {
  const { usuario, pode, permissoes } = usePainelSession();
  // Se a migration das permissões ainda não rodou, o módulo não existe na matriz:
  // nesse caso vale a regra simples (só admin).
  const podeEditar = permissoes['aparencia'] ? pode('aparencia', 'editar') : usuario?.perfil === 'admin';

  const [cor, setCor] = useState(corSalva ?? COR_DESTAQUE_PADRAO);
  const [hexTexto, setHexTexto] = useState(corSalva ?? COR_DESTAQUE_PADRAO);
  const [salvando, setSalvando] = useState(false);

  const efetiva = corSalva ?? COR_DESTAQUE_PADRAO;
  const mudou = cor.toLowerCase() !== efetiva.toLowerCase();

  function escolher(hex: string) {
    if (!podeEditar) return;
    setCor(hex);
    setHexTexto(hex);
  }

  function digitar(valor: string) {
    const v = valor.startsWith('#') ? valor : `#${valor}`;
    setHexTexto(v);
    if (hexValido(v)) setCor(v.toUpperCase());
  }

  async function salvar(novo: string | null) {
    setSalvando(true);
    try {
      await salvarCorDestaque(comunidadeId, novo);
      aplicarCorDestaque(novo);
      onSalva(novo);
      const efetivaNova = novo ?? COR_DESTAQUE_PADRAO;
      setCor(efetivaNova);
      setHexTexto(efetivaNova);
      toastSuccess(novo ? 'Cor atualizada.' : 'Cor padrão restaurada.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toastError(
        /cor_destaque|column/i.test(msg)
          ? 'O banco ainda não tem a coluna da cor. Rode a migration 20261111120000_aparencia.sql no Supabase.'
          : msg || 'Não foi possível salvar a cor.'
      );
    } finally {
      setSalvando(false);
    }
  }

  const textoSobreCor = corDoTexto(cor);

  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Palette size={16} aria-hidden /> Cor de destaque
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Escolha a cor que identifica a sua comunidade. Ela aparece no quadrado da comunidade, no círculo do usuário, no
          item ativo do menu, na linha sob o logo e no próprio símbolo.
        </p>

        {!podeEditar && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">
            <Lock size={14} aria-hidden /> Você pode ver, mas só quem tem a permissão de Aparência altera a cor.
          </div>
        )}

        <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-8" role="radiogroup" aria-label="Cores sugeridas">
          {PRESETS_COR.map((p) => {
            const ativa = p.hex.toLowerCase() === cor.toLowerCase();
            return (
              <button
                key={p.hex}
                type="button"
                role="radio"
                aria-checked={ativa}
                aria-label={p.nome}
                title={p.nome}
                disabled={!podeEditar}
                onClick={() => escolher(p.hex)}
                className={`flex h-12 items-center justify-center rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                  ativa ? 'border-text-primary ring-2 ring-text-primary/10' : 'border-border-soft hover:border-text-muted'
                }`}
                style={{ backgroundColor: p.hex, color: corDoTexto(p.hex) }}
              >
                {ativa && <Check size={18} aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-secondary">Outra cor (hex)</span>
            <input
              value={hexTexto}
              onChange={(e) => digitar(e.target.value)}
              disabled={!podeEditar}
              maxLength={7}
              spellCheck={false}
              aria-invalid={!hexValido(hexTexto)}
              className="h-10 w-32 rounded-lg border border-border bg-bg-card px-3 font-mono text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </label>
          <input
            type="color"
            value={hexValido(cor) ? cor : COR_DESTAQUE_PADRAO}
            onChange={(e) => escolher(e.target.value.toUpperCase())}
            disabled={!podeEditar}
            aria-label="Escolher cor no seletor"
            className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-bg-card p-1 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {!hexValido(hexTexto) && <p className="pb-2 text-xs text-danger">Use o formato #RRGGBB.</p>}
        </div>
      </section>

      <section className="border-t border-border-soft pt-6">
        <h3 className="text-sm font-semibold text-text-primary">Prévia</h3>
        <div className="mt-3 flex flex-wrap items-center gap-6 rounded-xl border border-border-soft bg-sidebar-bg p-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-semibold"
              style={{ backgroundColor: cor, color: textoSobreCor }}
            >
              CT
            </span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: cor, color: textoSobreCor }}
            >
              AB
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-sidebar-bg-hover px-3 py-2 text-sm font-medium text-sidebar-text-active">
            <Palette size={18} style={{ color: cor }} aria-hidden /> Item ativo
          </div>
          <div className="flex items-center gap-2">
            <Image
              src="/logo/simbolo.png"
              alt=""
              width={36}
              height={48}
              className="object-contain"
              style={{ filter: hexValido(cor) ? filtroDoLogo(cor) : undefined }}
            />
            <span className="text-base text-white">
              <span className="font-extrabold">MISSÃO</span>
              <span className="font-light" style={{ color: cor }}>
                Web
              </span>
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => salvar(cor)} loading={salvando} disabled={!podeEditar || !mudou || !hexValido(cor)}>
          Salvar cor
        </Button>
        <Button variant="secondary" icon={RotateCcw} onClick={() => salvar(null)} disabled={!podeEditar || salvando || corSalva === null}>
          Restaurar padrão
        </Button>
      </div>
    </div>
  );
}
