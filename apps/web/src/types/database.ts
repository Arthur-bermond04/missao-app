// Tipos que espelham o schema do Supabase (supabase/schema.sql)

export type Perfil = 'missionario' | 'lider' | 'coordenador' | 'padre' | 'admin';
export type Plano = 'semente' | 'missao' | 'diocese';
export type NivelInteresse = 'quente' | 'morno' | 'frio';
export type EtapaJornada = 'abordagem' | 'celula' | 'retiro' | 'cv' | 'cal';
export type StatusRetiro = 'aberto' | 'encerrado' | 'realizado';
export type TipoFinanceiro = 'receita' | 'despesa';
export type Canal = 'push' | 'whatsapp' | 'email' | 'sms';

export interface Usuario {
  id: string;
  comunidade_id: string | null;
  nome: string;
  telefone: string | null;
  perfil: Perfil;
  ativo: boolean;
  dispositivo_id: string | null;
  ultimo_acesso: string | null;
  preferencias_notificacao: Record<string, boolean> | null;
  criado_em: string;
}

export interface Comunidade {
  id: string;
  nome: string;
  tipo: string;
  plano: Plano;
  max_contatos: number | null;
  telefone: string | null;
  logo_url: string | null;
  meta_arrecadacao_mensal: number | null;
  categorias_financeiras: string[];
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
  pessoa_id: string | null;
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
  pessoa_id: string | null;
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
  ministerio_id: string | null;
  criado_em: string;
}

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

export type RecorrenciaMensagem = 'semanal' | 'mensal';

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
  recorrencia: RecorrenciaMensagem | null;
  criado_em: string;
}

export interface MensagemTemplate {
  id: string;
  comunidade_id: string;
  nome: string;
  titulo: string | null;
  corpo: string;
  criado_em: string;
}

// =========================================================
// MINISTÉRIOS
// =========================================================

export type TipoMinisterio = 'servico' | 'pastoral' | 'formacao';
export type CargoMinisterio = 'coordenador' | 'vice-coordenador' | 'membro';
export type CategoriaMinisterioFinanceiro = 'doacao' | 'repasse_comunidade' | 'material' | 'evento' | 'outros';

export interface Ministerio {
  id: string;
  comunidade_id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoMinisterio;
  coordenador_id: string | null;
  cor: string;
  ativo: boolean;
  criado_em: string;
}

export interface MinisterioMembro {
  id: string;
  ministerio_id: string;
  usuario_id: string | null;
  pessoa_id: string | null;
  cargo: CargoMinisterio;
  ativo: boolean;
  entrou_em: string;
  saiu_em: string | null;
  criado_em: string;
}

export interface MinisterioEncontro {
  id: string;
  ministerio_id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  horario: string | null;
  local: string | null;
  criado_em: string;
}

export interface MinisterioPresenca {
  id: string;
  encontro_id: string;
  usuario_id: string;
  presente: boolean;
  justificativa: string | null;
  criado_em: string;
}

export interface MinisterioFinanceiro {
  id: string;
  ministerio_id: string;
  comunidade_id: string;
  tipo: TipoFinanceiro;
  categoria: CategoriaMinisterioFinanceiro;
  descricao: string | null;
  valor: number;
  doador_id: string | null;
  doador_nome: string | null;
  data: string;
  criado_em: string;
}

export const TIPOS_MINISTERIO: { valor: TipoMinisterio; label: string }[] = [
  { valor: 'servico', label: 'Serviço' },
  { valor: 'pastoral', label: 'Pastoral' },
  { valor: 'formacao', label: 'Formação' },
];

export const CARGOS_MINISTERIO: { valor: CargoMinisterio; label: string }[] = [
  { valor: 'coordenador', label: 'Coordenador' },
  { valor: 'vice-coordenador', label: 'Vice-coordenador' },
  { valor: 'membro', label: 'Membro' },
];

export const CATEGORIAS_MINISTERIO_FINANCEIRO: { valor: CategoriaMinisterioFinanceiro; label: string }[] = [
  { valor: 'doacao', label: 'Doação' },
  { valor: 'repasse_comunidade', label: 'Repasse da comunidade' },
  { valor: 'material', label: 'Material' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'outros', label: 'Outros' },
];

export const CORES_MINISTERIO = [
  '#3C3489',
  '#0F6E56',
  '#854F0B',
  '#993C1D',
  '#185FA5',
  '#7A3E9D',
  '#B0327A',
  '#2A6F6F',
] as const;

// =========================================================
// ACOMPANHAMENTO PASTORAL
// =========================================================

export type EtapaFormacao = 'inicio' | 'cv' | 'cal' | 'obra' | 'integrado';
export type EstadoEspiritual = 'crescendo' | 'estavel' | 'atencao' | 'risco';
export type FrequenciaAcompanhamento = 'semanal' | 'quinzenal' | 'mensal' | 'sob_demanda';
export type TipoEncontroPastoral = 'presencial' | 'online' | 'telefone' | 'mensagem';
export type EstadoOvelhaEncontro = 'muito_bem' | 'bem' | 'estavel' | 'dificuldade' | 'crise';
export type TemaPastoral =
  | 'oracao'
  | 'vida_familiar'
  | 'trabalho'
  | 'fe'
  | 'relacionamentos'
  | 'missao'
  | 'saude'
  | 'financeiro';
export type TipoEventoPastoral = 'missa' | 'celula' | 'retiro' | 'ministerio' | 'formacao';

export interface PastoralOvelha {
  id: string;
  comunidade_id: string;
  pastor_id: string;
  usuario_id: string | null;
  pessoa_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
  idade: number | null;
  etapa_formacao: EtapaFormacao;
  estado_espiritual: EstadoEspiritual;
  data_inicio_acompanhamento: string;
  frequencia_acompanhamento: FrequenciaAcompanhamento;
  objetivo_atual: string | null;
  proxima_reuniao: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface PastoralEncontro {
  id: string;
  ovelha_id: string;
  pastor_id: string;
  data: string;
  duracao_minutos: number | null;
  tipo: TipoEncontroPastoral;
  estado_ovelha: EstadoOvelhaEncontro;
  temas_abordados: TemaPastoral[] | null;
  relato: string;
  encaminhamentos: string | null;
  proxima_reuniao: string | null;
  nivel_abertura: number | null;
  criado_em: string;
}

export interface PastoralPresenca {
  id: string;
  ovelha_id: string;
  tipo_evento: TipoEventoPastoral;
  nome_evento: string | null;
  data: string;
  presente: boolean;
  criado_em: string;
}

export const ETAPAS_FORMACAO: { valor: EtapaFormacao; label: string }[] = [
  { valor: 'inicio', label: 'Início' },
  { valor: 'cv', label: 'CV' },
  { valor: 'cal', label: 'CAL' },
  { valor: 'obra', label: 'Obra' },
  { valor: 'integrado', label: 'Integrado' },
];

export const ESTADOS_ESPIRITUAL: { valor: EstadoEspiritual; label: string }[] = [
  { valor: 'crescendo', label: 'Crescendo' },
  { valor: 'estavel', label: 'Estável' },
  { valor: 'atencao', label: 'Atenção' },
  { valor: 'risco', label: 'Risco' },
];

export const FREQUENCIAS_ACOMPANHAMENTO: { valor: FrequenciaAcompanhamento; label: string; dias: number }[] = [
  { valor: 'semanal', label: 'Semanal', dias: 7 },
  { valor: 'quinzenal', label: 'Quinzenal', dias: 15 },
  { valor: 'mensal', label: 'Mensal', dias: 30 },
  { valor: 'sob_demanda', label: 'Sob demanda', dias: 90 },
];

// Estado da ovelha em cada encontro + pontuação para o gráfico de evolução
export const ESTADOS_OVELHA_ENCONTRO: {
  valor: EstadoOvelhaEncontro;
  label: string;
  emoji: string;
  score: number;
}[] = [
  { valor: 'muito_bem', label: 'Muito bem', emoji: '😊', score: 5 },
  { valor: 'bem', label: 'Bem', emoji: '🙂', score: 4 },
  { valor: 'estavel', label: 'Estável', emoji: '😐', score: 3 },
  { valor: 'dificuldade', label: 'Dificuldade', emoji: '😟', score: 2 },
  { valor: 'crise', label: 'Crise', emoji: '😰', score: 1 },
];

export const TEMAS_PASTORAL: { valor: TemaPastoral; label: string }[] = [
  { valor: 'oracao', label: 'Oração' },
  { valor: 'vida_familiar', label: 'Vida familiar' },
  { valor: 'trabalho', label: 'Trabalho' },
  { valor: 'fe', label: 'Fé' },
  { valor: 'relacionamentos', label: 'Relacionamentos' },
  { valor: 'missao', label: 'Missão' },
  { valor: 'saude', label: 'Saúde' },
  { valor: 'financeiro', label: 'Financeiro' },
];

// =========================================================
// CADASTRO CENTRAL DE PESSOAS
// =========================================================

export type Sexo = 'masculino' | 'feminino' | 'nao_informado';
export type SituacaoFe = 'nao_praticante' | 'catolico_praticante' | 'outra_religiao' | 'sem_religiao' | 'nao_informado';
export type OrigemPessoa = 'evangelizacao' | 'retiro' | 'indicacao' | 'celula' | 'evento' | 'outro';
export type EtapaJornadaPessoa =
  | 'contato_inicial'
  | 'interessado'
  | 'participando'
  | 'cv'
  | 'cal'
  | 'integrado'
  | 'afastado';
export type FrequenciaAcompanhamentoPessoa = 'semanal' | 'quinzenal' | 'mensal' | 'sob_demanda' | 'nenhum';
export type TipoInteracao = 'contato' | 'visita' | 'celula' | 'evento' | 'missa' | 'conversa' | 'outro';
export type CanalInteracao = 'presencial' | 'whatsapp' | 'telefone' | 'email';

export interface Pessoa {
  id: string;
  comunidade_id: string;
  cadastrado_por: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  data_nascimento: string | null;
  idade: number | null;
  sexo: Sexo | null;
  cidade: string | null;
  bairro: string | null;
  situacao_fe: SituacaoFe;
  origem: OrigemPessoa;
  local_primeiro_contato: string | null;
  data_primeiro_contato: string;
  etapa_jornada: EtapaJornadaPessoa;
  nivel_interesse: NivelInteresse;
  frequencia_acompanhamento: FrequenciaAcompanhamentoPessoa | null;
  proxima_visita: string | null;
  ultimo_contato: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
  tags: string[] | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface PessoaRetiro {
  id: string;
  pessoa_id: string;
  retiro_id: string | null;
  nome_retiro: string;
  data_retiro: string;
  participou: boolean;
  observacao: string | null;
  criado_em: string;
}

export interface PessoaInteracao {
  id: string;
  pessoa_id: string;
  usuario_id: string;
  data: string;
  tipo: TipoInteracao;
  canal: CanalInteracao | null;
  descricao: string;
  proximo_passo: string | null;
  criado_em: string;
}

export const ETAPAS_JORNADA_PESSOA: { valor: EtapaJornadaPessoa; label: string; descricao: string }[] = [
  { valor: 'contato_inicial', label: 'Contato inicial', descricao: 'Foi abordado/chegou, mas ainda não se engajou' },
  { valor: 'interessado', label: 'Interessado', descricao: 'Demonstrou interesse, quer saber mais' },
  { valor: 'participando', label: 'Participando', descricao: 'Frequenta células, eventos, missas' },
  { valor: 'cv', label: 'CV', descricao: 'Está na Comunidade de Vida' },
  { valor: 'cal', label: 'CAL', descricao: 'Está na Comunidade de Aliança' },
  { valor: 'integrado', label: 'Integrado', descricao: 'Totalmente integrado à comunidade' },
  { valor: 'afastado', label: 'Afastado', descricao: 'Se afastou (continua no cadastro)' },
];

export const ORIGENS_PESSOA: { valor: OrigemPessoa; label: string }[] = [
  { valor: 'evangelizacao', label: 'Evangelização na rua' },
  { valor: 'retiro', label: 'Retiro' },
  { valor: 'indicacao', label: 'Indicação' },
  { valor: 'celula', label: 'Célula' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'outro', label: 'Outro' },
];

export const SITUACOES_FE: { valor: SituacaoFe; label: string }[] = [
  { valor: 'nao_praticante', label: 'Não praticante' },
  { valor: 'catolico_praticante', label: 'Católico praticante' },
  { valor: 'outra_religiao', label: 'Outra religião' },
  { valor: 'sem_religiao', label: 'Sem religião' },
  { valor: 'nao_informado', label: 'Não informado' },
];

export const FREQUENCIAS_ACOMPANHAMENTO_PESSOA: { valor: FrequenciaAcompanhamentoPessoa; label: string; dias: number | null }[] = [
  { valor: 'semanal', label: 'Semanal', dias: 7 },
  { valor: 'quinzenal', label: 'Quinzenal', dias: 15 },
  { valor: 'mensal', label: 'Mensal', dias: 30 },
  { valor: 'sob_demanda', label: 'Sob demanda', dias: null },
  { valor: 'nenhum', label: 'Nenhum', dias: null },
];

export const TIPOS_INTERACAO: { valor: TipoInteracao; label: string }[] = [
  { valor: 'contato', label: 'Contato (ligação/mensagem)' },
  { valor: 'visita', label: 'Visita' },
  { valor: 'celula', label: 'Célula' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'missa', label: 'Missa' },
  { valor: 'conversa', label: 'Conversa' },
  { valor: 'outro', label: 'Outro' },
];

export const CANAIS_INTERACAO: { valor: CanalInteracao; label: string }[] = [
  { valor: 'presencial', label: 'Presencial' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'telefone', label: 'Telefone' },
  { valor: 'email', label: 'E-mail' },
];

export const TAGS_PESSOA = [
  'Jovem',
  'Universitário',
  'Família',
  'Busca cura',
  'Busca sentido',
  'Problemas familiares',
  'Em crise',
  'Recém-chegado',
] as const;
