-- =========================================================
-- MÓDULOS: MINISTÉRIOS + ACOMPANHAMENTO PASTORAL
-- Rodar manualmente no SQL Editor do Supabase, depois de schema.sql
-- (depende das funções auth_comunidade_id() e auth_perfil() e das
--  tabelas comunidades / usuarios já criadas no schema.sql)
-- =========================================================

-- =============================================
-- MÓDULO 1: MINISTÉRIOS
-- =============================================

CREATE TABLE ministerios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  comunidade_id uuid NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'servico',
  -- tipos: 'servico' (Liturgia, Louvor), 'pastoral' (Primeiro Anúncio), 'formacao' (Jovens, Catequese)
  coordenador_id uuid REFERENCES usuarios(id),
  cor text DEFAULT '#3C3489', -- cor de identificação visual do ministério
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ministerio_membros (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministerio_id uuid NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  cargo text NOT NULL DEFAULT 'membro',
  -- cargos: 'coordenador', 'vice-coordenador', 'membro'
  ativo boolean NOT NULL DEFAULT true,
  entrou_em date NOT NULL DEFAULT CURRENT_DATE,
  saiu_em date,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ministerio_id, usuario_id)
);

CREATE TABLE ministerio_encontros (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministerio_id uuid NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Reunião',
  descricao text,
  data date NOT NULL,
  horario time,
  local text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ministerio_presencas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  encontro_id uuid NOT NULL REFERENCES ministerio_encontros(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  presente boolean NOT NULL DEFAULT false,
  justificativa text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(encontro_id, usuario_id)
);

CREATE TABLE ministerio_financeiro (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministerio_id uuid NOT NULL REFERENCES ministerios(id) ON DELETE CASCADE,
  comunidade_id uuid NOT NULL REFERENCES comunidades(id),
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria text NOT NULL DEFAULT 'outros',
  -- categorias: 'doacao', 'repasse_comunidade', 'material', 'evento', 'outros'
  descricao text,
  valor numeric(10,2) NOT NULL,
  doador_id uuid REFERENCES usuarios(id), -- quem doou (opcional)
  doador_nome text, -- para doadores externos não cadastrados
  data date NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- MÓDULO 2: ACOMPANHAMENTO PASTORAL
-- =============================================

CREATE TABLE pastoral_ovelhas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  comunidade_id uuid NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  pastor_id uuid NOT NULL REFERENCES usuarios(id),
  -- o pastor/acompanhador responsável
  usuario_id uuid REFERENCES usuarios(id),
  -- se a ovelha é membro cadastrado no app
  nome text NOT NULL,
  telefone text,
  email text,
  idade integer,
  etapa_formacao text DEFAULT 'inicio',
  -- etapas: 'inicio', 'cv', 'cal', 'obra', 'integrado'
  estado_espiritual text DEFAULT 'estavel',
  -- estados: 'crescendo', 'estavel', 'atencao', 'risco'
  data_inicio_acompanhamento date NOT NULL DEFAULT CURRENT_DATE,
  frequencia_acompanhamento text DEFAULT 'mensal',
  -- 'semanal', 'quinzenal', 'mensal', 'sob_demanda'
  objetivo_atual text,
  proxima_reuniao date,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pastoral_encontros (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ovelha_id uuid NOT NULL REFERENCES pastoral_ovelhas(id) ON DELETE CASCADE,
  pastor_id uuid NOT NULL REFERENCES usuarios(id),
  data date NOT NULL,
  duracao_minutos integer,
  tipo text NOT NULL DEFAULT 'presencial',
  -- tipos: 'presencial', 'online', 'telefone', 'mensagem'
  estado_ovelha text NOT NULL DEFAULT 'estavel',
  -- 'muito_bem', 'bem', 'estavel', 'dificuldade', 'crise'
  temas_abordados text[],
  -- ['oracao', 'vida_familiar', 'trabalho', 'fe', 'relacionamentos', 'missao', 'saude', 'financeiro']
  relato text NOT NULL,
  -- o que foi conversado (privado, só o pastor vê)
  encaminhamentos text,
  proxima_reuniao date,
  nivel_abertura integer CHECK (nivel_abertura BETWEEN 1 AND 5),
  -- 1=muito fechado, 5=muito aberto
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pastoral_presencas (
  -- presença da ovelha em eventos gerais (missas, retiros, células)
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ovelha_id uuid NOT NULL REFERENCES pastoral_ovelhas(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL,
  -- 'missa', 'celula', 'retiro', 'ministerio', 'formacao'
  nome_evento text,
  data date NOT NULL,
  presente boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS — Row Level Security
-- =============================================

-- Ministérios
ALTER TABLE ministerios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerio_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerio_encontros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerio_presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministerio_financeiro ENABLE ROW LEVEL SECURITY;

-- Pastoral
ALTER TABLE pastoral_ovelhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_encontros ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_presencas ENABLE ROW LEVEL SECURITY;

-- Políticas: mesma comunidade pode ver ministérios
CREATE POLICY "ministerios_select" ON ministerios
  FOR SELECT USING (comunidade_id = auth_comunidade_id());

CREATE POLICY "ministerios_write_lideranca" ON ministerios
  FOR ALL USING (comunidade_id = auth_comunidade_id() AND auth_perfil() IN ('coordenador', 'admin'))
  WITH CHECK (comunidade_id = auth_comunidade_id() AND auth_perfil() IN ('coordenador', 'admin'));

CREATE POLICY "ministerio_membros_select" ON ministerio_membros
  FOR SELECT USING (
    ministerio_id IN (SELECT id FROM ministerios WHERE comunidade_id = auth_comunidade_id())
  );

CREATE POLICY "ministerio_membros_write" ON ministerio_membros
  FOR ALL USING (
    ministerio_id IN (SELECT id FROM ministerios WHERE comunidade_id = auth_comunidade_id())
    AND auth_perfil() IN ('coordenador', 'admin')
  );

CREATE POLICY "ministerio_encontros_select" ON ministerio_encontros
  FOR SELECT USING (
    ministerio_id IN (SELECT id FROM ministerios WHERE comunidade_id = auth_comunidade_id())
  );

CREATE POLICY "ministerio_encontros_write" ON ministerio_encontros
  FOR ALL USING (
    ministerio_id IN (SELECT id FROM ministerios WHERE comunidade_id = auth_comunidade_id())
  );

CREATE POLICY "ministerio_presencas_select" ON ministerio_presencas
  FOR SELECT USING (
    encontro_id IN (
      SELECT me.id FROM ministerio_encontros me
      JOIN ministerios m ON m.id = me.ministerio_id
      WHERE m.comunidade_id = auth_comunidade_id()
    )
  );

-- ADICIONADO (não estava no spec original): sem esta policy de escrita, o RLS
-- bloquearia o registro de presença. Permite inserir/atualizar presenças de
-- encontros de ministérios da própria comunidade.
CREATE POLICY "ministerio_presencas_write" ON ministerio_presencas
  FOR ALL USING (
    encontro_id IN (
      SELECT me.id FROM ministerio_encontros me
      JOIN ministerios m ON m.id = me.ministerio_id
      WHERE m.comunidade_id = auth_comunidade_id()
    )
  )
  WITH CHECK (
    encontro_id IN (
      SELECT me.id FROM ministerio_encontros me
      JOIN ministerios m ON m.id = me.ministerio_id
      WHERE m.comunidade_id = auth_comunidade_id()
    )
  );

CREATE POLICY "ministerio_financeiro_select" ON ministerio_financeiro
  FOR SELECT USING (comunidade_id = auth_comunidade_id());

CREATE POLICY "ministerio_financeiro_write" ON ministerio_financeiro
  FOR ALL USING (comunidade_id = auth_comunidade_id() AND auth_perfil() IN ('coordenador', 'admin'));

-- Pastoral: pastor vê apenas suas próprias ovelhas; admin vê todas
CREATE POLICY "pastoral_ovelhas_select" ON pastoral_ovelhas
  FOR SELECT USING (
    comunidade_id = auth_comunidade_id() AND
    (pastor_id = auth.uid() OR auth_perfil() = 'admin')
  );

CREATE POLICY "pastoral_ovelhas_write" ON pastoral_ovelhas
  FOR ALL USING (
    comunidade_id = auth_comunidade_id() AND
    (pastor_id = auth.uid() OR auth_perfil() = 'admin')
  )
  WITH CHECK (
    comunidade_id = auth_comunidade_id() AND
    (pastor_id = auth.uid() OR auth_perfil() = 'admin')
  );

CREATE POLICY "pastoral_encontros_select" ON pastoral_encontros
  FOR SELECT USING (
    pastor_id = auth.uid() OR auth_perfil() = 'admin'
  );

CREATE POLICY "pastoral_encontros_write" ON pastoral_encontros
  FOR ALL USING (
    pastor_id = auth.uid() OR auth_perfil() = 'admin'
  )
  WITH CHECK (
    pastor_id = auth.uid() OR auth_perfil() = 'admin'
  );

CREATE POLICY "pastoral_presencas_all" ON pastoral_presencas
  FOR ALL USING (
    ovelha_id IN (
      SELECT id FROM pastoral_ovelhas
      WHERE comunidade_id = auth_comunidade_id()
      AND (pastor_id = auth.uid() OR auth_perfil() = 'admin')
    )
  );
