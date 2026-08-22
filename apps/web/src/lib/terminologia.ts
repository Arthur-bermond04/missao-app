'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { usePainelSession } from './PainelSessionContext';
import {
  TERMINOLOGIA_PADRAO,
  type EtapaFormacao,
  type EtapaJornada,
  type EtapaJornadaPessoa,
  type GeneroGramatical,
  type Terminologia,
} from '../types/database';

// Lê comunidades.terminologia da comunidade do usuário logado. Cada tela que
// mostra "CV"/"CAL"/"Ovelha"/"Pastor" deve usar esse hook em vez de string
// fixa — sem ele, trocar o nome em Configurações não reflete em lugar nenhum.
export function useTerminologia(): Terminologia {
  const { usuario } = usePainelSession();
  const [terminologia, setTerminologia] = useState<Terminologia>(TERMINOLOGIA_PADRAO);

  useEffect(() => {
    if (!usuario?.comunidade_id) return;
    supabase
      .from('comunidades')
      .select('terminologia')
      .eq('id', usuario.comunidade_id)
      .single()
      .then(({ data }) => {
        const t = (data as { terminologia: Partial<Terminologia> } | null)?.terminologia;
        if (t) setTerminologia({ ...TERMINOLOGIA_PADRAO, ...t });
      });
  }, [usuario?.comunidade_id]);

  return terminologia;
}

// Helpers pra aplicar a terminologia customizada em cima das listas fixas de
// etapas (o valor salvo no banco continua 'cv'/'cal' — só o rótulo muda).
export function labelEtapaJornada(etapa: EtapaJornada, terminologia: Terminologia): string {
  if (etapa === 'cv') return terminologia.etapa_cv;
  if (etapa === 'cal') return `Integrados (${terminologia.etapa_cal})`;
  const PADRAO: Record<EtapaJornada, string> = {
    abordagem: 'Abordagens',
    // Antes fixo em "Foram à célula" — não acompanhava a troca do nome do
    // módulo em Configurações. "Em" em vez de "a/à/ao" de propósito: evita
    // crase, e concorda igual pra "Em Grupo" e "Em Célula".
    celula: `Em ${terminologia.modulo_celulas}`,
    retiro: 'Foram a retiro',
    cv: terminologia.etapa_cv,
    cal: `Integrados (${terminologia.etapa_cal})`,
  };
  return PADRAO[etapa];
}

export function labelEtapaJornadaPessoa(etapa: EtapaJornadaPessoa, terminologia: Terminologia): string {
  if (etapa === 'cv') return terminologia.etapa_cv;
  if (etapa === 'cal') return terminologia.etapa_cal;
  const PADRAO: Record<EtapaJornadaPessoa, string> = {
    contato_inicial: 'Contato inicial',
    interessado: 'Interessado',
    participando: 'Participando',
    cv: terminologia.etapa_cv,
    cal: terminologia.etapa_cal,
    integrado: 'Integrado',
    afastado: 'Afastado',
  };
  return PADRAO[etapa];
}

export function labelEtapaFormacao(etapa: EtapaFormacao, terminologia: Terminologia): string {
  if (etapa === 'cv') return terminologia.etapa_cv;
  if (etapa === 'cal') return terminologia.etapa_cal;
  const PADRAO: Record<EtapaFormacao, string> = {
    inicio: 'Início',
    cv: terminologia.etapa_cv,
    cal: terminologia.etapa_cal,
    obra: 'Obra',
    integrado: 'Integrado',
  };
  return PADRAO[etapa];
}

// ---------------------------------------------------------------------------
// Concordância de gênero para modulo_celulas — o único termo configurável que
// aparece em frases com adjetivo/artigo ("Nova célula", "Novo grupo"), não só
// como rótulo solto de menu. A comunidade escolhe o termo E o gênero dele
// juntos em Configurações (ver AbaComunidade.tsx); sem o gênero não dá pra
// saber se é "Novo" ou "Nova" de um texto livre.
// ---------------------------------------------------------------------------

export function generoModuloCelulas(terminologia: Terminologia): GeneroGramatical {
  return terminologia.modulo_celulas_genero ?? 'm';
}

/** "o"/"a" conforme o gênero. */
export function artigoDefinido(genero: GeneroGramatical): string {
  return genero === 'f' ? 'a' : 'o';
}

/** "os"/"as" conforme o gênero. */
export function artigoDefinidoPlural(genero: GeneroGramatical): string {
  return genero === 'f' ? 'as' : 'os';
}

/** "um"/"uma" conforme o gênero. */
export function artigoIndefinido(genero: GeneroGramatical): string {
  return genero === 'f' ? 'uma' : 'um';
}

/** "do"/"da" (contração de "de" + artigo definido) conforme o gênero. */
export function preposicaoDe(genero: GeneroGramatical): string {
  return genero === 'f' ? 'da' : 'do';
}

/** Escolhe a forma certa de um par masculino/feminino (Novo/Nova, Nenhum/Nenhuma, Este/Esta...). */
export function flexiona(genero: GeneroGramatical, masculino: string, feminino: string): string {
  return genero === 'f' ? feminino : masculino;
}

/**
 * Plural aproximado de um substantivo comum em português — cobre os casos
 * esperados aqui (Grupo→Grupos, Célula→Células, Comunidade→Comunidades).
 * Não é um pluralizador geral da língua (não trata mol→móis, pão→pães etc.);
 * serve só pra pluralizar o termo de modulo_celulas no rótulo do menu.
 */
export function pluralizar(singular: string): string {
  const s = singular.trim();
  if (!s) return s;
  const ultima = s.at(-1)?.toLowerCase();
  if (ultima === 'r' || ultima === 's' || ultima === 'z') return `${s}es`;
  if (ultima === 'm') return `${s.slice(0, -1)}ns`;
  if (ultima === 'l') return `${s.slice(0, -1)}is`;
  return `${s}s`;
}

export interface TermosCelula {
  singular: string;
  singularMin: string;
  plural: string;
  pluralMin: string;
  genero: GeneroGramatical;
  artigo: string;
  artigoPlural: string;
  artigoIndef: string;
  de: string;
  novo: string;
  nenhum: string;
  este: string;
  ativo: string;
  inativo: string;
  /** "Ativos"/"Ativas" — capitalizado, plural, pronto pra opção de filtro. */
  ativosLabel: string;
  /** "Inativos"/"Inativas" — idem. */
  inativosLabel: string;
  /** "Ativo"/"Ativa" — capitalizado, singular, pronto pro badge de um card. */
  ativoLabel: string;
  /** "Inativo"/"Inativa" — idem. */
  inativoLabel: string;
  desativado: string;
  reativado: string;
  atualizado: string;
  criado: string;
}

/**
 * Todas as formas derivadas do termo de modulo_celulas, prontas pra usar em
 * frase — evita repetir a mesma cadeia de flexiona()/artigoDefinido() em
 * cada tela que fala de Grupos/Células. Único módulo que precisa disso: é o
 * único cujo termo aparece em frases com concordância, não só como rótulo
 * solto de menu (ver comentário em Terminologia, types/database.ts).
 */
export function useTermosCelula(): TermosCelula {
  const terminologia = useTerminologia();
  const genero = generoModuloCelulas(terminologia);
  const singular = terminologia.modulo_celulas;
  const plural = pluralizar(singular);
  return {
    singular,
    singularMin: singular.toLowerCase(),
    plural,
    pluralMin: plural.toLowerCase(),
    genero,
    artigo: artigoDefinido(genero),
    artigoPlural: artigoDefinidoPlural(genero),
    artigoIndef: artigoIndefinido(genero),
    de: preposicaoDe(genero),
    novo: flexiona(genero, 'Novo', 'Nova'),
    nenhum: flexiona(genero, 'Nenhum', 'Nenhuma'),
    este: flexiona(genero, 'Este', 'Esta'),
    ativo: flexiona(genero, 'ativo', 'ativa'),
    inativo: flexiona(genero, 'inativo', 'inativa'),
    ativosLabel: flexiona(genero, 'Ativos', 'Ativas'),
    inativosLabel: flexiona(genero, 'Inativos', 'Inativas'),
    ativoLabel: flexiona(genero, 'Ativo', 'Ativa'),
    inativoLabel: flexiona(genero, 'Inativo', 'Inativa'),
    desativado: flexiona(genero, 'desativado', 'desativada'),
    reativado: flexiona(genero, 'reativado', 'reativada'),
    atualizado: flexiona(genero, 'atualizado', 'atualizada'),
    criado: flexiona(genero, 'criado', 'criada'),
  };
}
