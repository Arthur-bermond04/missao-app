-- =========================================================
-- MÓDULO: CADASTRO CENTRAL DE PESSOAS
-- Rodar manualmente no SQL Editor do Supabase, depois de schema.sql
-- (depende de uuid_generate_v4(), auth_comunidade_id(), auth_perfil(),
--  comunidades e usuarios já criadas)
-- =========================================================

CREATE TABLE pessoas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  comunidade_id uuid NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  cadastrado_por uuid NOT NULL REFERENCES usuarios(id),
  -- quem criou o registro

  -- Dados pessoais
  nome text NOT NULL,
  telefone text,
  whatsapp text, -- pode ser diferente do telefone
  email text,
  data_nascimento date,
  idade integer, -- calculado ou preenchido manualmente
  sexo text, -- 'masculino', 'feminino', 'nao_informado'
  cidade text,
  bairro text,

  -- Situação na fé
  situacao_fe text NOT NULL DEFAULT 'nao_informado',
  -- valores: 'nao_praticante', 'catolico_praticante',
  --          'outra_religiao', 'sem_religiao', 'nao_informado'

  -- Como chegou à comunidade
  origem text NOT NULL DEFAULT 'evangelizacao',
  -- valores: 'evangelizacao' (abordado na rua)
  --          'retiro' (veio por causa de um retiro)
  --          'indicacao' (indicado por alguém)
  --          'celula' (chegou por uma célula)
  --          'evento' (chegou por um evento)
  --          'outro'

  local_primeiro_contato text,
  -- onde foi o primeiro contato (ex: "Praça da Matriz")
  data_primeiro_contato date NOT NULL DEFAULT CURRENT_DATE,

  -- Situação atual na comunidade
  etapa_jornada text NOT NULL DEFAULT 'contato_inicial',
  -- valores (em ordem crescente de envolvimento):
  -- 'contato_inicial'  → foi abordado/chegou, mas ainda não se engajou
  -- 'interessado'      → demonstrou interesse, quer saber mais
  -- 'participando'     → frequenta células, eventos, missas
  -- 'cv'               → está na Comunidade de Vida
  -- 'cal'              → está na Comunidade de Aliança
  -- 'integrado'        → totalmente integrado à comunidade
  -- 'afastado'         → se afastou (mas continua no cadastro)

  nivel_interesse text NOT NULL DEFAULT 'morno',
  -- 'quente', 'morno', 'frio' — igual ao funil de evangelização

  -- Controle de acompanhamento
  frequencia_acompanhamento text DEFAULT 'mensal',
  -- 'semanal', 'quinzenal', 'mensal', 'sob_demanda', 'nenhum'
  proxima_visita date,
  ultimo_contato date,
  responsavel_id uuid REFERENCES usuarios(id),
  -- quem é responsável pelo acompanhamento desta pessoa
  -- pode ser diferente de quem cadastrou

  -- Observações
  observacoes text,
  tags text[], -- ex: ['jovem', 'universitario', 'busca_cura', 'familia_problemas']

  -- Controle
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Tabela de retiros que a pessoa participou
CREATE TABLE pessoa_retiros (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pessoa_id uuid NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  retiro_id uuid REFERENCES retiros(id),
  -- null se o retiro foi antes de usar o app (registro histórico)
  nome_retiro text NOT NULL,
  -- preenchido automaticamente se retiro_id existir
  data_retiro date NOT NULL,
  participou boolean NOT NULL DEFAULT true,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Tabela de interações/contatos com a pessoa
CREATE TABLE pessoa_interacoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pessoa_id uuid NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  -- quem registrou a interação
  data date NOT NULL,
  tipo text NOT NULL DEFAULT 'contato',
  -- 'contato' (ligação, mensagem), 'visita', 'celula',
  -- 'evento', 'missa', 'conversa', 'outro'
  canal text DEFAULT 'presencial',
  -- 'presencial', 'whatsapp', 'telefone', 'email'
  descricao text NOT NULL,
  -- o que foi conversado/feito
  proximo_passo text,
  -- o que combinou para fazer
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_pessoas_comunidade ON pessoas(comunidade_id);
CREATE INDEX idx_pessoas_cadastrado_por ON pessoas(cadastrado_por);
CREATE INDEX idx_pessoas_responsavel ON pessoas(responsavel_id);
CREATE INDEX idx_pessoas_etapa ON pessoas(etapa_jornada);
CREATE INDEX idx_pessoa_retiros_pessoa ON pessoa_retiros(pessoa_id);
CREATE INDEX idx_pessoa_interacoes_pessoa ON pessoa_interacoes(pessoa_id);

-- RLS
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoa_retiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoa_interacoes ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê apenas quem ele cadastrou OU é responsável
-- Coordenador/admin vê todos da comunidade
CREATE POLICY "pessoas_select" ON pessoas
  FOR SELECT USING (
    comunidade_id = auth_comunidade_id() AND (
      cadastrado_por = auth.uid() OR
      responsavel_id = auth.uid() OR
      auth_perfil() IN ('coordenador', 'admin')
    )
  );

CREATE POLICY "pessoas_insert" ON pessoas
  FOR INSERT WITH CHECK (
    comunidade_id = auth_comunidade_id()
  );

CREATE POLICY "pessoas_update" ON pessoas
  FOR UPDATE USING (
    comunidade_id = auth_comunidade_id() AND (
      cadastrado_por = auth.uid() OR
      responsavel_id = auth.uid() OR
      auth_perfil() IN ('coordenador', 'admin')
    )
  );

-- ADICIONADO (não estava no spec original): sem policy de DELETE, um
-- "arquivar" via update funciona (ativo=false), mas se algum fluxo tentar
-- excluir de verdade o RLS bloquearia silenciosamente. Como o app usa
-- "arquivar" (soft delete) em vez de exclusão real, isso é intencional —
-- mas deixamos explícito aqui para não ser esquecido depois.

CREATE POLICY "pessoa_retiros_all" ON pessoa_retiros
  FOR ALL USING (
    pessoa_id IN (
      SELECT id FROM pessoas
      WHERE comunidade_id = auth_comunidade_id()
      AND (
        cadastrado_por = auth.uid() OR
        responsavel_id = auth.uid() OR
        auth_perfil() IN ('coordenador', 'admin')
      )
    )
  );

CREATE POLICY "pessoa_interacoes_all" ON pessoa_interacoes
  FOR ALL USING (
    pessoa_id IN (
      SELECT id FROM pessoas
      WHERE comunidade_id = auth_comunidade_id()
      AND (
        cadastrado_por = auth.uid() OR
        responsavel_id = auth.uid() OR
        auth_perfil() IN ('coordenador', 'admin')
      )
    )
  );
