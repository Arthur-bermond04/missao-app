const CHAVE = 'missaoapp:acessados-recentes';
const LIMITE = 8;

export type TipoAcessoRecente = 'pessoa' | 'ovelha' | 'ministerio' | 'retiro';

export interface AcessoRecente {
  tipo: TipoAcessoRecente;
  id: string;
  titulo: string;
  href: string;
  acessadoEm: string;
}

export const LABEL_TIPO: Record<TipoAcessoRecente, string> = {
  pessoa: 'Pessoa',
  ovelha: 'Pastoral',
  ministerio: 'Ministério',
  retiro: 'Retiro',
};

// Persistido em localStorage (é só um atalho de navegação, não precisa ir pro banco).
export function registrarAcessoRecente(item: Omit<AcessoRecente, 'acessadoEm'>) {
  if (typeof window === 'undefined') return;
  try {
    const atuais = listarAcessosRecentes().filter((a) => !(a.tipo === item.tipo && a.id === item.id));
    const novos = [{ ...item, acessadoEm: new Date().toISOString() }, ...atuais].slice(0, LIMITE);
    window.localStorage.setItem(CHAVE, JSON.stringify(novos));
  } catch {
    // localStorage indisponível (modo privado etc.) — não é crítico, ignora
  }
}

export function listarAcessosRecentes(): AcessoRecente[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as AcessoRecente[]) : [];
  } catch {
    return [];
  }
}
