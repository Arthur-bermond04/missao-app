import { supabase } from './supabase';
import { criarPessoa, type NovaPessoaDados } from './pessoas';

export type OrigemDuplicata = 'contato' | 'inscricao' | 'ovelha';

export interface RegistroSemVinculo {
  origem: OrigemDuplicata;
  id: string;
  nome: string;
  telefone: string | null;
  contexto?: string; // ex: nome do retiro, pra dar mais pista pro admin
}

export interface ClusterDuplicata {
  chave: string;
  nome: string;
  telefone: string | null;
  registros: RegistroSemVinculo[];
}

function normalizarTelefone(telefone: string | null | undefined): string {
  return (telefone ?? '').replace(/\D/g, '');
}

function normalizarNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Busca registros das 3 tabelas que ainda guardam gente "solta" (sem
// pessoa_id) — ministerio_membros fica de fora de propósito: uma linha lá
// sem pessoa_id sempre tem usuario_id preenchido (é a constraint do banco),
// ou seja, já é um membro com login vinculado a uma conta real, não uma
// pessoa duplicada/perdida à espera de fusão.
export async function buscarRegistrosSemVinculo(comunidadeId: string): Promise<RegistroSemVinculo[]> {
  const [contatos, retiros, ovelhas] = await Promise.all([
    supabase
      .from('contatos')
      .select('id, nome, telefone')
      .eq('comunidade_id', comunidadeId)
      .is('pessoa_id', null),
    supabase.from('retiros').select('id, nome').eq('comunidade_id', comunidadeId),
    supabase
      .from('pastoral_ovelhas')
      .select('id, nome, telefone')
      .eq('comunidade_id', comunidadeId)
      .is('pessoa_id', null),
  ]);

  if (contatos.error) throw contatos.error;
  if (retiros.error) throw retiros.error;
  if (ovelhas.error) throw ovelhas.error;

  const retirosDaComunidade = (retiros.data as { id: string; nome: string }[]) ?? [];
  const nomePorRetiroId = new Map(retirosDaComunidade.map((r) => [r.id, r.nome]));

  const registros: RegistroSemVinculo[] = [];

  for (const c of (contatos.data as { id: string; nome: string; telefone: string | null }[]) ?? []) {
    registros.push({ origem: 'contato', id: c.id, nome: c.nome, telefone: c.telefone });
  }

  if (retirosDaComunidade.length > 0) {
    const { data: inscricoes, error: erroInsc } = await supabase
      .from('inscricoes_retiro')
      .select('id, nome, telefone, retiro_id')
      .is('pessoa_id', null)
      .in('retiro_id', retirosDaComunidade.map((r) => r.id));
    if (erroInsc) throw erroInsc;
    for (const i of (inscricoes as { id: string; nome: string | null; telefone: string | null; retiro_id: string }[]) ?? []) {
      if (!i.nome) continue;
      registros.push({ origem: 'inscricao', id: i.id, nome: i.nome, telefone: i.telefone, contexto: nomePorRetiroId.get(i.retiro_id) });
    }
  }

  for (const o of (ovelhas.data as { id: string; nome: string; telefone: string | null }[]) ?? []) {
    registros.push({ origem: 'ovelha', id: o.id, nome: o.nome, telefone: o.telefone });
  }

  return registros;
}

// Agrupa por telefone normalizado (sinal mais confiável); quando não há
// telefone em nenhum dos dois lados, agrupa por nome normalizado idêntico.
// Só devolve grupos com 2+ registros de origens diferentes — a mesma pessoa
// aparecendo em módulos diferentes é o cenário que a ferramenta resolve.
export function agruparCandidatos(registros: RegistroSemVinculo[]): ClusterDuplicata[] {
  const porTelefone = new Map<string, RegistroSemVinculo[]>();
  const semTelefone: RegistroSemVinculo[] = [];

  for (const r of registros) {
    const tel = normalizarTelefone(r.telefone);
    if (tel.length >= 8) {
      const lista = porTelefone.get(tel) ?? [];
      lista.push(r);
      porTelefone.set(tel, lista);
    } else {
      semTelefone.push(r);
    }
  }

  const porNome = new Map<string, RegistroSemVinculo[]>();
  for (const r of semTelefone) {
    const chave = normalizarNome(r.nome);
    const lista = porNome.get(chave) ?? [];
    lista.push(r);
    porNome.set(chave, lista);
  }

  const clusters: ClusterDuplicata[] = [];
  for (const [chave, lista] of porTelefone) {
    if (lista.length < 2) continue;
    if (new Set(lista.map((r) => r.origem)).size < 2) continue;
    clusters.push({ chave: `tel:${chave}`, nome: lista[0].nome, telefone: lista[0].telefone, registros: lista });
  }
  for (const [chave, lista] of porNome) {
    if (lista.length < 2) continue;
    if (new Set(lista.map((r) => r.origem)).size < 2) continue;
    clusters.push({ chave: `nome:${chave}`, nome: lista[0].nome, telefone: null, registros: lista });
  }

  return clusters;
}

const TABELA_POR_ORIGEM: Record<OrigemDuplicata, string> = {
  contato: 'contatos',
  inscricao: 'inscricoes_retiro',
  ovelha: 'pastoral_ovelhas',
};

export async function vincularClusterAPessoa(cluster: ClusterDuplicata, pessoaId: string) {
  await Promise.all(
    cluster.registros.map((r) =>
      supabase
        .from(TABELA_POR_ORIGEM[r.origem])
        .update({ pessoa_id: pessoaId })
        .eq('id', r.id)
        .then(({ error }) => {
          if (error) throw error;
        })
    )
  );
}

export async function criarPessoaEVincularCluster(
  cluster: ClusterDuplicata,
  dados: Pick<NovaPessoaDados, 'comunidade_id' | 'cadastrado_por'>
) {
  const pessoa = await criarPessoa({
    ...dados,
    nome: cluster.nome,
    telefone: cluster.telefone ?? undefined,
  });
  await vincularClusterAPessoa(cluster, pessoa.id);
  return pessoa;
}
