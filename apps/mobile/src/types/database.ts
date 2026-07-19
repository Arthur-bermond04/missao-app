// Tipos que espelham o schema do Supabase (supabase/schema.sql)

export type Perfil = 'missionario' | 'lider' | 'coordenador' | 'padre' | 'admin';
export type Plano = 'semente' | 'missao' | 'diocese';
export type NivelInteresse = 'quente' | 'morno' | 'frio';
export type EtapaJornada = 'abordagem' | 'celula' | 'retiro' | 'cv' | 'cal';
export type StatusRetiro = 'aberto' | 'encerrado' | 'realizado';
export type TipoFinanceiro = 'receita' | 'despesa';
export type Canal = 'push' | 'whatsapp' | 'email' | 'sms';

export interface Comunidade {
  id: string;
  nome: string;
  tipo: 'paroquia' | 'comunidade' | 'movimento';
  plano: Plano;
  max_contatos: number | null;
  criado_em: string;
}

export interface Usuario {
  id: string;
  comunidade_id: string | null;
  nome: string;
  telefone: string | null;
  perfil: Perfil;
  ativo: boolean;
  dispositivo_id: string | null;
  ultimo_acesso: string | null;
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
  latitude: number | null;
  longitude: number | null;
  data_abordagem: string;
  tags: string[];
  observacoes: string | null;
  etapa_jornada: EtapaJornada;
  proximo_contato: string | null;
  sincronizado: boolean;
  criado_em: string;
}

export interface Retiro {
  id: string;
  comunidade_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  local: string | null;
  vagas: number | null;
  valor: number | null;
  status: StatusRetiro;
  criado_em: string;
}

export interface InscricaoRetiro {
  id: string;
  retiro_id: string;
  contato_id: string | null;
  usuario_id: string | null;
  nome: string | null;
  telefone: string | null;
  pagou: boolean;
  valor_pago: number | null;
  grupo: string | null;
  presente: boolean;
  criado_em: string;
}

export interface Celula {
  id: string;
  comunidade_id: string;
  nome: string;
  lider_id: string | null;
  dia_semana: string | null;
  horario: string | null;
  endereco: string | null;
  ativa: boolean;
  criado_em: string;
}

export interface Financeiro {
  id: string;
  comunidade_id: string;
  tipo: TipoFinanceiro;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
  retiro_id: string | null;
  criado_em: string;
}

export interface MensagemEnviada {
  id: string;
  comunidade_id: string;
  remetente_id: string | null;
  canal: Canal;
  destinatarios: string;
  titulo: string | null;
  corpo: string;
  enviado_em: string | null;
  total_enviados: number;
}

export interface MensagemTemplate {
  id: string;
  comunidade_id: string;
  nome: string;
  titulo: string | null;
  corpo: string;
  criado_em: string;
}

export interface Lembrete {
  id: string;
  usuario_id: string;
  contato_id: string | null;
  data_lembrete: string;
  texto: string | null;
  concluido: boolean;
  criado_em: string;
}

// Ordem das etapas da jornada — usada para montar o funil
export const ETAPAS_FUNIL: { valor: EtapaJornada; label: string }[] = [
  { valor: 'abordagem', label: 'Abordagens' },
  { valor: 'celula', label: 'Foram à célula' },
  { valor: 'retiro', label: 'Foram a retiro' },
  { valor: 'cv', label: 'CV' },
  { valor: 'cal', label: 'Integrados (CAL)' },
];

export const CATEGORIAS_FINANCEIRO = [
  'dizimo',
  'oferta',
  'retiro',
  'bazar',
  'manutencao',
  'material',
  'salarios',
  'outros',
] as const;

// Tags de interesse pré-definidas (Módulo 1 — Tela 2)
export const TAGS_INTERESSE = [
  'Quer ir a retiro',
  'Curiosidade sobre CV',
  'Veio com familiar',
  'Busca cura',
  'Afastada da Igreja',
  'Pede oração',
  'Interesse em célula',
  'Já é católico praticante',
] as const;
