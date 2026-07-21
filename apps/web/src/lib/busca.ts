import { supabase } from './supabase';

export type TipoResultadoBusca = 'pessoa' | 'contato' | 'membro' | 'retiro' | 'ovelha' | 'financeiro' | 'ministerio';

export interface ResultadoBusca {
  tipo: TipoResultadoBusca;
  id: string;
  titulo: string;
  subtitulo?: string;
  href: string;
}

export const LABEL_SECAO: Record<TipoResultadoBusca, string> = {
  pessoa: 'Pessoas',
  contato: 'Contatos (funil)',
  membro: 'Membros',
  retiro: 'Retiros',
  ovelha: 'Pastoral',
  financeiro: 'Financeiro',
  ministerio: 'Ministérios',
};

// Busca MVP: um .ilike por tabela, em paralelo, respeitando o RLS já existente
// (pessoas/pastoral só trazem o que o usuário logado pode ver; as demais são
// por comunidade). Contatos/financeiro/retiros/ministérios não têm rota de
// detalhe própria ainda, então apontam para a página da seção.
export async function buscaGlobal(comunidadeId: string, termo: string): Promise<ResultadoBusca[]> {
  const q = termo.trim();
  if (q.length < 2) return [];

  const [pessoas, contatos, membros, retiros, ovelhas, financeiro, ministerios] = await Promise.all([
    supabase
      .from('pessoas')
      .select('id, nome, telefone')
      .eq('comunidade_id', comunidadeId)
      .eq('ativo', true)
      .ilike('nome', `%${q}%`)
      .limit(5),
    supabase
      .from('contatos')
      .select('id, nome, telefone, pessoa_id')
      .eq('comunidade_id', comunidadeId)
      .ilike('nome', `%${q}%`)
      .limit(5),
    supabase
      .from('usuarios')
      .select('id, nome, telefone')
      .eq('comunidade_id', comunidadeId)
      .ilike('nome', `%${q}%`)
      .limit(5),
    supabase.from('retiros').select('id, nome, data_inicio').eq('comunidade_id', comunidadeId).ilike('nome', `%${q}%`).limit(5),
    supabase.from('pastoral_ovelhas').select('id, nome, telefone').eq('comunidade_id', comunidadeId).ilike('nome', `%${q}%`).limit(5),
    supabase
      .from('financeiro')
      .select('id, descricao, valor')
      .eq('comunidade_id', comunidadeId)
      .ilike('descricao', `%${q}%`)
      .limit(5),
    supabase.from('ministerios').select('id, nome, tipo').eq('comunidade_id', comunidadeId).ilike('nome', `%${q}%`).limit(5),
  ]);

  const resultados: ResultadoBusca[] = [];

  for (const p of (pessoas.data as { id: string; nome: string; telefone: string | null }[]) ?? []) {
    resultados.push({ tipo: 'pessoa', id: p.id, titulo: p.nome, subtitulo: p.telefone ?? undefined, href: `/pessoas/${p.id}` });
  }
  for (const c of (contatos.data as { id: string; nome: string; telefone: string | null; pessoa_id: string | null }[]) ?? []) {
    resultados.push({
      tipo: 'contato',
      id: c.id,
      titulo: c.nome,
      subtitulo: c.telefone ?? undefined,
      href: c.pessoa_id ? `/pessoas/${c.pessoa_id}` : '/funil',
    });
  }
  for (const m of (membros.data as { id: string; nome: string; telefone: string | null }[]) ?? []) {
    resultados.push({ tipo: 'membro', id: m.id, titulo: m.nome, subtitulo: m.telefone ?? undefined, href: '/membros' });
  }
  for (const r of (retiros.data as { id: string; nome: string; data_inicio: string }[]) ?? []) {
    resultados.push({
      tipo: 'retiro',
      id: r.id,
      titulo: r.nome,
      subtitulo: new Date(r.data_inicio).toLocaleDateString('pt-BR'),
      href: '/retiros',
    });
  }
  for (const o of (ovelhas.data as { id: string; nome: string; telefone: string | null }[]) ?? []) {
    resultados.push({ tipo: 'ovelha', id: o.id, titulo: o.nome, subtitulo: o.telefone ?? undefined, href: `/pastoral/${o.id}` });
  }
  for (const f of (financeiro.data as { id: string; descricao: string | null; valor: number }[]) ?? []) {
    resultados.push({
      tipo: 'financeiro',
      id: f.id,
      titulo: f.descricao ?? 'Sem descrição',
      subtitulo: `R$ ${f.valor.toFixed(2)}`,
      href: '/financeiro',
    });
  }
  for (const m of (ministerios.data as { id: string; nome: string; tipo: string }[]) ?? []) {
    resultados.push({ tipo: 'ministerio', id: m.id, titulo: m.nome, subtitulo: m.tipo, href: '/ministerios' });
  }

  return resultados;
}
