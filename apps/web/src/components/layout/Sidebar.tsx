'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { useTerminologia } from '@/lib/terminologia';
import { useSidebarLayout } from '@/lib/SidebarLayoutContext';
import { montarNavGrupos, type NavLink } from '@/lib/navegacao';
import { Logo } from '@/components/ui/Logo';
import { BuscaGlobal } from '@/components/layout/BuscaGlobal';
import type { AcaoPermissao, Perfil } from '@/types/database';

const CHAVE_GRUPOS = 'missaoweb:menu-grupos-abertos';

export const PERFIL_LABEL_SIDEBAR: Record<Perfil, string> = {
  missionario: 'Missionário',
  lider: 'Líder',
  coordenador: 'Coordenador',
  padre: 'Padre',
  admin: 'Admin',
};

export function podeVerItem(item: NavLink, pode: (modulo: string, acao: AcaoPermissao) => boolean): boolean {
  return !item.modulo || pode(item.modulo, 'ver');
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? [partes[0][0], partes[partes.length - 1][0]] : [partes[0]?.[0] ?? ''];
  return letras.join('').toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, pode } = usePainelSession();
  const terminologia = useTerminologia();
  const { colapsada } = useSidebarLayout();
  // Texto/rótulos só aparecem em telas lg+ E quando a sidebar não foi
  // encolhida manualmente — em md (sempre estreita) o toggle não tem efeito
  // nenhum, de propósito: não há o que "expandir" abaixo de lg.
  const mostrarTexto = !colapsada;
  const [nomeComunidade, setNomeComunidade] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    supabase
      .from('comunidades')
      .select('nome')
      .eq('id', usuario.comunidade_id)
      .single()
      .then(({ data }) => setNomeComunidade((data as { nome: string } | null)?.nome ?? ''));
  }, [usuario?.comunidade_id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscaAberta(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Submenus: quais grupos estão abertos. Guardado no navegador, para o menu
  // continuar como a pessoa deixou. Começa vazio (igual ao HTML do servidor) e
  // só lê a preferência depois de montar.
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_GRUPOS) ?? '[]');
      if (Array.isArray(salvo)) setAbertos(new Set(salvo.filter((t): t is string => typeof t === 'string')));
    } catch {
      // sem localStorage: o menu funciona do mesmo jeito, só não lembra
    }
  }, []);

  function alternarGrupo(titulo: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(titulo)) novo.delete(titulo);
      else novo.add(titulo);
      try {
        localStorage.setItem(CHAVE_GRUPOS, JSON.stringify([...novo]));
      } catch {
        // idem
      }
      return novo;
    });
  }

  // Esconde da navegação os itens cujo módulo o perfil logado não pode ver,
  // segundo a matriz de permissões da comunidade — grupos que ficam vazios
  // depois do filtro simplesmente não aparecem.
  const gruposVisiveis = montarNavGrupos(terminologia)
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => podeVerItem(item, pode)),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  // O item ativo é o de href mais específico: /pastoral/monitoria acende só
  // "Painel da Liderança", não também "Acompanhamento".
  const hrefAtivo = gruposVisiveis
    .flatMap((g) => g.itens)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // Ao navegar, o grupo da página atual abre sozinho.
  const grupoAtivo = gruposVisiveis.find((g) => g.itens.some((i) => i.href === hrefAtivo))?.titulo;
  useEffect(() => {
    if (!grupoAtivo) return;
    setAbertos((atual) => (atual.has(grupoAtivo) ? atual : new Set(atual).add(grupoAtivo)));
  }, [grupoAtivo]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col overflow-hidden bg-sidebar-bg md:flex ${
        colapsada ? '' : 'lg:w-[264px]'
      }`}
    >
      {usuario?.comunidade_id && (
        <BuscaGlobal open={buscaAberta} onClose={() => setBuscaAberta(false)} comunidadeId={usuario.comunidade_id} />
      )}

      {/*
        Faixa branca com o logo, como no modelo, na mesma altura da barra superior
        (h-14) para as duas linhas se alinharem. O resto do menu segue escuro.
        Colapsada (72px): só o símbolo; expandida (264px): símbolo e nome.
      */}
      <Link
        href="/dashboard"
        title="Ir para o início"
        aria-label="Ir para o início"
        className="flex h-14 shrink-0 items-center justify-center border-b-2 border-destaque bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-destaque lg:justify-start lg:px-5"
      >
        <div className={`flex items-center justify-center ${mostrarTexto ? 'lg:hidden' : ''}`}>
          <Logo size={28} variant="color" />
        </div>
        {mostrarTexto && (
          <div className="hidden lg:flex">
            <Logo size={30} variant="color" showText />
          </div>
        )}
      </Link>

      <div className="h-3 shrink-0" aria-hidden />

      {/* Busca global — abre a mesma paleta de comando (Ctrl+K) usada no resto do app */}
      <div className="shrink-0 px-3 pb-2">
        <button
          type="button"
          onClick={() => setBuscaAberta(true)}
          title="Buscar (Ctrl+K)"
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-[15px] text-sidebar-text transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg ${
            mostrarTexto ? 'lg:justify-start' : ''
          }`}
        >
          <Search size={16} />
          <span className={`hidden flex-1 text-left ${mostrarTexto ? 'lg:inline' : ''}`}>Buscar...</span>
        </button>
      </div>

      <nav className="scrollbar-escura mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 pb-3" aria-label="Navegação principal">
        {gruposVisiveis.map((grupo, indiceGrupo) => {
          const submenu = !!grupo.icon && grupo.itens.length > 1;

          // Link solto (ícone + nome). Usado em grupos simples, no menu recolhido e abaixo de lg.
          const linkSolto = (item: NavLink) => {
            const ativo = item.href === hrefAtivo;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={`${item.label} — ${item.descricao}`}
                aria-current={ativo ? 'page' : undefined}
                className={`mx-2 my-px flex items-center justify-center gap-3 rounded-md px-2.5 py-2.5 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg ${
                  mostrarTexto ? 'lg:justify-start' : ''
                } ${
                  ativo
                    ? 'bg-sidebar-bg-hover text-sidebar-text-active'
                    : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active'
                }`}
              >
                <Icon size={18} className={`shrink-0 ${ativo ? 'text-destaque' : ''}`} />
                <span className={`hidden ${mostrarTexto ? 'lg:inline' : ''}`}>{item.label}</span>
              </Link>
            );
          };

          // Grupo simples ou menu recolhido: itens soltos, com um traço entre os grupos.
          if (!submenu || !mostrarTexto) {
            return (
              <div key={grupo.titulo}>
                {indiceGrupo > 0 && !mostrarTexto && <div className="mx-3 my-1 h-px bg-sidebar-border" />}
                {grupo.itens.map(linkSolto)}
              </div>
            );
          }

          // Submenu: cabeçalho com seta + itens recuados, com uma linha-guia à esquerda.
          const aberto = abertos.has(grupo.titulo);
          const algumAtivo = grupo.itens.some((i) => i.href === hrefAtivo);
          const GrupoIcon = grupo.icon!;
          const idLista = `submenu-${indiceGrupo}`;
          return (
            <div key={grupo.titulo}>
              {/* abaixo de lg o menu é só ícones: mostra os itens soltos */}
              <div className="lg:hidden">{grupo.itens.map(linkSolto)}</div>

              <div className="hidden lg:block">
                <button
                  type="button"
                  onClick={() => alternarGrupo(grupo.titulo)}
                  aria-expanded={aberto}
                  aria-controls={idLista}
                  className={`mx-2 my-px flex w-[calc(100%-1rem)] items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg ${
                    algumAtivo && !aberto ? 'bg-sidebar-bg-hover text-sidebar-text-active' : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active'
                  }`}
                >
                  <GrupoIcon size={18} className={`shrink-0 ${algumAtivo ? 'text-destaque' : ''}`} />
                  <span className="flex-1 truncate">{grupo.titulo}</span>
                  <ChevronRight size={16} className={`shrink-0 transition-transform ${aberto ? 'rotate-90' : ''}`} aria-hidden />
                </button>

                {aberto && (
                  <div id={idLista} className="mb-1 ml-7 mr-2 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {grupo.itens.map((item) => {
                      const ativo = item.href === hrefAtivo;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={`${item.label} — ${item.descricao}`}
                          aria-current={ativo ? 'page' : undefined}
                          className={`block rounded-md px-3 py-2 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green ${
                            ativo
                              ? 'bg-sidebar-bg-hover font-medium text-sidebar-text-active'
                              : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-sidebar-text-active'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
