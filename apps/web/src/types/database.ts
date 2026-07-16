// Tipos que espelham o schema do Supabase (supabase/schema.sql)

export type Perfil = 'missionario' | 'lider' | 'coordenador' | 'padre' | 'admin';
export type Plano = 'semente' | 'missao' | 'diocese';
export type NivelInteresse = 'quente' | 'morno' | 'frio';
export type EtapaJornada = 'abordagem' | 'celula' | 'retiro' | 'cv' | 'cal';

export interface Usuario {
  id: string;
  comunidade_id: string | null;
  nome: string;
  telefone: string | null;
  perfil: Perfil;
  ativo: boolean;
  criado_em: string;
}

export interface Contato {
  id: string;
  comunidade_id: string;
  missionario_id: string | null;
  nome: string;
  telefone: string | null;
  idade: number | null;
  nivel_interesse: NivelInteresse;
  local_abordagem: string | null;
  data_abordagem: string;
  tags: string[];
  observacoes: string | null;
  etapa_jornada: EtapaJornada;
  proximo_contato: string | null;
  criado_em: string;
}

// Ordem das etapas da jornada — usada para montar o funil (Módulo 2)
export const ETAPAS_FUNIL: { valor: EtapaJornada; label: string }[] = [
  { valor: 'abordagem', label: 'Abordagens' },
  { valor: 'celula', label: 'Foram à célula' },
  { valor: 'retiro', label: 'Foram a retiro' },
  { valor: 'cv', label: 'CV' },
  { valor: 'cal', label: 'Integrados (CAL)' },
];
