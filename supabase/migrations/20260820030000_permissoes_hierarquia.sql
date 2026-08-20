-- =========================================================
-- PERMISSOES CONFIGURAVEIS + HIERARQUIA DE SUPERVISAO
--
-- Antes desta migration o controle de acesso era feito com o perfil do
-- usuario escrito como literal dentro de cada policy
-- (auth_perfil() in ('coordenador','admin')), repetido em 45 lugares. Para
-- adicionar um perfil novo ou soltar um modulo para um perfil era preciso
-- reescrever SQL em varios arquivos.
--
-- Agora existe uma tabela `permissoes` (perfil x modulo x acao) e as policies
-- consultam auth_pode(modulo, acao).
--
-- IMPORTANTE: os defaults abaixo reproduzem exatamente as regras que ja
-- valiam. Rodar esta migration NAO muda o acesso de ninguem.
--
-- Tambem adiciona usuarios.supervisor_id, para que um coordenador/pastor de
-- rede enxergue as ovelhas dos lideres abaixo dele (antes so o proprio pastor
-- e o admin enxergavam).
-- =========================================================

-- =========================================================
-- CATALOGO DE MODULOS
-- =========================================================
create table permissoes_modulos (
  chave text primary key,
  nome text not null,
  grupo text not null,              -- agrupamento da arvore na tela de permissoes
  acoes text[] not null,            -- acoes que fazem sentido neste modulo
  ordem integer not null default 0
);

comment on table permissoes_modulos is
  'Catalogo global de modulos do sistema. Espelha a navegacao do painel web (ver NAV_GRUPOS em Sidebar.tsx).';

-- ALCANCE DE CADA ACAO
--
-- criar/editar/excluir sempre valem no banco (as policies chamam auth_pode).
--
-- A acao "ver", porem, so tem efeito no RLS onde a leitura ja era restrita ou
-- onde da para restringir sem efeito colateral: funil, financeiro, pessoas,
-- pessoas_todas, pastoral, pastoral_todas e monitoria.
--
-- Em membros, equipe, retiros, ministerios, celulas, mensagens, agenda e
-- configuracoes o "ver" controla apenas o menu do painel. O SELECT dessas
-- tabelas continua liberado para a comunidade inteira de proposito: elas
-- aparecem em join e em subquery de policy espalhadas pelo app (nome do
-- responsavel, ministerio do membro, retiro da inscricao) e travar a leitura
-- derrubaria telas que nada tem a ver com o modulo desmarcado.

-- Modulos terminados em "_todas" sao o escopo AMPLIADO: agir sobre registros
-- de outras pessoas. O modulo sem sufixo e o escopo proprio (e tambem o que
-- controla a visibilidade do item no menu). Essa separacao existe porque em
-- Pessoas e Pastoral o dono do registro sempre teve acesso por um caminho
-- proprio (responsavel_id / pastor_id) — se houvesse um "ver" so, ou o menu
-- sumia para quem tem ovelha propria, ou todo mundo passaria a ver as ovelhas
-- de todo mundo.
insert into permissoes_modulos (chave, nome, grupo, acoes, ordem) values
  ('pessoas',       'Pessoas',            'Cadastros', array['ver','criar','editar'],           10),
  ('pessoas_todas', 'Pessoas de outros responsaveis', 'Cadastros', array['ver','editar','excluir'], 15),
  ('membros',       'Membros',            'Cadastros', array['ver','criar','editar'],           20),
  ('equipe',        'Equipe',             'Cadastros', array['ver','criar','editar','excluir'], 30),
  ('funil',         'Funil',              'Missao',    array['ver','criar','editar'],           40),
  ('funil_todos',   'Contatos de outros missionarios', 'Missao', array['editar','excluir'],     45),
  ('retiros',       'Retiros',            'Missao',    array['ver','criar','editar','excluir'], 50),
  ('ministerios',   'Ministerios',        'Missao',    array['ver','criar','editar','excluir'], 60),
  ('celulas',       'Celulas',            'Missao',    array['ver','criar','editar','excluir'], 70),
  ('pastoral',      'Pastoral',           'Missao',    array['ver','criar','editar'],           80),
  ('pastoral_todas','Ovelhas de outros pastores', 'Missao', array['ver','editar'],              85),
  ('monitoria',     'Monitoria pastoral', 'Missao',    array['ver'],                            90),
  ('agenda',        'Agenda',             'Missao',    array['ver','criar','editar','excluir'], 100),
  ('alertas',       'Alertas',            'Gestao',    array['ver'],                            110),
  ('mensagens',     'Comunicacao',        'Gestao',    array['ver','criar','editar','excluir'], 120),
  ('financeiro',    'Financeiro',         'Gestao',    array['ver','criar','editar','excluir'], 130),
  ('relatorios',    'Relatorios',         'Gestao',    array['ver'],                            140),
  ('configuracoes', 'Configuracoes',      'Sistema',   array['ver','editar'],                   150);

-- =========================================================
-- MATRIZ DE PERMISSOES
--
-- comunidade_id null = default do sistema.
-- comunidade_id preenchido = override daquela comunidade, que vence o default.
-- =========================================================
create table permissoes (
  id uuid primary key default uuid_generate_v4(),
  comunidade_id uuid references comunidades(id) on delete cascade,
  perfil text not null check (perfil in ('missionario', 'lider', 'coordenador', 'padre', 'admin')),
  modulo text not null references permissoes_modulos(chave) on delete cascade,
  acao text not null check (acao in ('ver', 'criar', 'editar', 'excluir')),
  permitido boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Um unico registro por (comunidade, perfil, modulo, acao).
--
-- NULLS NOT DISTINCT (Postgres 15+) e necessario aqui por dois motivos: sem
-- ele os defaults do sistema (comunidade_id null) nao seriam deduplicados,
-- porque NULL != NULL no indice padrao; e um indice parcial
-- (where comunidade_id is not null) nao serve de arbitro para o ON CONFLICT
-- do upsert que a tela de permissoes usa.
create unique index idx_permissoes_unica
  on permissoes(comunidade_id, perfil, modulo, acao)
  nulls not distinct;

create index idx_permissoes_lookup on permissoes(perfil, modulo, acao);

-- Defaults do sistema: reproduzem as regras que estavam hardcoded nas policies.
insert into permissoes (comunidade_id, perfil, modulo, acao, permitido)
select
  null,
  perfil,
  d.modulo,
  d.acao,
  perfil = any(d.perfis)
from (values
  -- modulo,          acao,      perfis que podiam antes desta migration
  -- Escopo proprio: quem cadastrou ou e responsavel sempre pode ver/editar,
  -- como ja era. Por isso vem liberado para todos os perfis.
  ('pessoas',       'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('pessoas',       'criar',   array['missionario','lider','coordenador','padre','admin']),
  ('pessoas',       'editar',  array['missionario','lider','coordenador','padre','admin']),
  -- Escopo ampliado: era o auth_perfil() in ('coordenador','admin') da policy.
  ('pessoas_todas', 'ver',     array['coordenador','admin']),
  ('pessoas_todas', 'editar',  array['coordenador','admin']),
  ('pessoas_todas', 'excluir', array['admin']),

  ('membros',       'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('membros',       'criar',   array['coordenador','admin']),
  ('membros',       'editar',  array['coordenador','admin']),

  ('equipe',        'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('equipe',        'criar',   array['coordenador','admin']),
  ('equipe',        'editar',  array['coordenador','admin']),
  ('equipe',        'excluir', array['coordenador','admin']),

  ('funil',         'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('funil',         'criar',   array['missionario','lider','coordenador','padre','admin']),
  -- editar o proprio contato sempre foi permitido (missionario_id = auth.uid())
  ('funil',         'editar',  array['missionario','lider','coordenador','padre','admin']),
  ('funil_todos',   'editar',  array['lider','coordenador','admin']),
  ('funil_todos',   'excluir', array['coordenador','admin']),

  ('retiros',       'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('retiros',       'criar',   array['coordenador','admin']),
  ('retiros',       'editar',  array['coordenador','admin']),
  ('retiros',       'excluir', array['coordenador','admin']),

  ('ministerios',   'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('ministerios',   'criar',   array['coordenador','admin']),
  ('ministerios',   'editar',  array['coordenador','admin']),
  ('ministerios',   'excluir', array['coordenador','admin']),

  ('celulas',       'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('celulas',       'criar',   array['lider','coordenador','admin']),
  ('celulas',       'editar',  array['lider','coordenador','admin']),
  ('celulas',       'excluir', array['lider','coordenador','admin']),

  -- Pastoral, escopo proprio: o pastor sempre acessou as proprias ovelhas
  -- (pastor_id = auth.uid()), independente do perfil.
  ('pastoral',      'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('pastoral',      'criar',   array['missionario','lider','coordenador','padre','admin']),
  ('pastoral',      'editar',  array['missionario','lider','coordenador','padre','admin']),
  -- Escopo ampliado: era o auth_perfil() = 'admin' das policies de pastoral.
  ('pastoral_todas','ver',     array['admin']),
  ('pastoral_todas','editar',  array['admin']),

  ('monitoria',     'ver',     array['coordenador','admin']),

  ('agenda',        'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('agenda',        'criar',   array['coordenador','padre','admin']),
  ('agenda',        'editar',  array['coordenador','padre','admin']),
  ('agenda',        'excluir', array['coordenador','padre','admin']),

  ('alertas',       'ver',     array['coordenador','admin']),

  ('mensagens',     'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('mensagens',     'criar',   array['coordenador','admin']),
  ('mensagens',     'editar',  array['coordenador','admin']),
  ('mensagens',     'excluir', array['coordenador','admin']),

  ('financeiro',    'ver',     array['coordenador','admin']),
  ('financeiro',    'criar',   array['coordenador','admin']),
  ('financeiro',    'editar',  array['coordenador','admin']),
  ('financeiro',    'excluir', array['coordenador','admin']),

  ('relatorios',    'ver',     array['coordenador','admin']),

  ('configuracoes', 'ver',     array['missionario','lider','coordenador','padre','admin']),
  ('configuracoes', 'editar',  array['admin'])
) as d(modulo, acao, perfis)
cross join unnest(array['missionario','lider','coordenador','padre','admin']) as perfil;

-- =========================================================
-- HIERARQUIA DE SUPERVISAO
-- =========================================================
alter table usuarios add column supervisor_id uuid references usuarios(id) on delete set null;

create index idx_usuarios_supervisor on usuarios(supervisor_id);

comment on column usuarios.supervisor_id is
  'A quem este usuario se reporta. Permite visao em cascata (rede -> celula -> ovelha).';

-- Impede ciclo na hierarquia (A supervisiona B que supervisiona A), que
-- travaria a CTE recursiva de auth_subordinados().
create or replace function usuarios_valida_supervisor()
returns trigger
language plpgsql
as $$
declare
  atual uuid := new.supervisor_id;
  saltos integer := 0;
begin
  if new.supervisor_id is null then
    return new;
  end if;

  if new.supervisor_id = new.id then
    raise exception 'Um usuario nao pode ser supervisor de si mesmo';
  end if;

  while atual is not null loop
    saltos := saltos + 1;
    if saltos > 50 then
      raise exception 'Hierarquia de supervisao profunda demais (possivel ciclo)';
    end if;

    select supervisor_id into atual from usuarios where id = atual;

    if atual = new.id then
      raise exception 'Ciclo na hierarquia de supervisao';
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_usuarios_valida_supervisor
  before insert or update of supervisor_id on usuarios
  for each row execute function usuarios_valida_supervisor();

-- =========================================================
-- FUNCOES AUXILIARES
-- =========================================================

-- Resolve permissao: override da comunidade vence o default do sistema;
-- na ausencia dos dois, nega.
create or replace function auth_pode(p_modulo text, p_acao text)
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (
      select permitido from permissoes
      where comunidade_id = auth_comunidade_id()
        and perfil = auth_perfil()
        and modulo = p_modulo
        and acao = p_acao
    ),
    (
      select permitido from permissoes
      where comunidade_id is null
        and perfil = auth_perfil()
        and modulo = p_modulo
        and acao = p_acao
    ),
    false
  );
$$;

-- Todos os usuarios abaixo do usuario autenticado na hierarquia (nao inclui
-- ele mesmo).
create or replace function auth_subordinados()
returns setof uuid
language sql
stable
security definer
as $$
  with recursive abaixo as (
    select id from usuarios where supervisor_id = auth.uid()
    union
    select u.id from usuarios u join abaixo a on u.supervisor_id = a.id
  )
  select id from abaixo;
$$;

-- true se o usuario autenticado supervisiona (direta ou indiretamente) p_usuario
create or replace function auth_supervisiona(p_usuario uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (select 1 from auth_subordinados() s where s = p_usuario);
$$;

-- =========================================================
-- RLS DAS TABELAS NOVAS
--
-- A gestao da propria tabela de permissoes continua checando o perfil como
-- literal ('admin'), de proposito: se ela dependesse de auth_pode() um admin
-- poderia se trancar para fora do sistema desmarcando a propria permissao.
-- =========================================================
alter table permissoes_modulos enable row level security;
alter table permissoes enable row level security;

create policy "permissoes_modulos_select" on permissoes_modulos
  for select using (auth.uid() is not null);

-- Qualquer usuario logado le a matriz (o app precisa dela para montar o menu
-- e habilitar/desabilitar botoes). Ler a matriz nao expoe dado de ninguem.
create policy "permissoes_select" on permissoes
  for select using (
    auth.uid() is not null
    and (comunidade_id is null or comunidade_id = auth_comunidade_id())
  );

-- So admin cria/edita override, e so da propria comunidade. Os defaults do
-- sistema (comunidade_id null) nao sao editaveis pelo app.
create policy "permissoes_write_admin" on permissoes
  for all using (
    comunidade_id = auth_comunidade_id() and auth_perfil() = 'admin'
  )
  with check (
    comunidade_id = auth_comunidade_id() and auth_perfil() = 'admin'
  );

-- =========================================================
-- POLICIES CONVERTIDAS PARA auth_pode()
--
-- Os caminhos de dono (missionario_id = auth.uid(), pastor_id = auth.uid(),
-- cadastrado_por/responsavel_id) foram preservados: so o termo do perfil
-- virou auth_pode().
-- =========================================================

-- ---------- COMUNIDADES ----------
drop policy if exists "comunidade_update_admin" on comunidades;
create policy "comunidade_update_admin" on comunidades
  for update using (id = auth_comunidade_id() and auth_pode('configuracoes', 'editar'));

-- ---------- USUARIOS / MEMBROS ----------
drop policy if exists "usuarios_update_proprio_ou_admin" on usuarios;
create policy "usuarios_update_proprio_ou_admin" on usuarios
  for update using (id = auth.uid() or auth_pode('membros', 'editar'));

drop policy if exists "usuarios_insert_admin" on usuarios;
create policy "usuarios_insert_admin" on usuarios
  for insert with check (auth_pode('membros', 'criar'));

-- ---------- CONTATOS / FUNIL ----------
drop policy if exists "contatos_select_comunidade" on contatos;
create policy "contatos_select_comunidade" on contatos
  for select using (comunidade_id = auth_comunidade_id() and auth_pode('funil', 'ver'));

drop policy if exists "contatos_insert_comunidade" on contatos;
create policy "contatos_insert_comunidade" on contatos
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('funil', 'criar'));

drop policy if exists "contatos_update_proprio_ou_lideranca" on contatos;
create policy "contatos_update_proprio_ou_lideranca" on contatos
  for update using (
    comunidade_id = auth_comunidade_id()
    and (
      (missionario_id = auth.uid() and auth_pode('funil', 'editar'))
      or auth_pode('funil_todos', 'editar')
    )
  );

drop policy if exists "contatos_delete_lideranca" on contatos;
create policy "contatos_delete_lideranca" on contatos
  for delete using (
    comunidade_id = auth_comunidade_id() and auth_pode('funil_todos', 'excluir')
  );

-- NOTA SOBRE "FOR ALL"
--
-- Uma policy `for all` cobre tambem o DELETE. Se as regras de escrita
-- continuassem em uma policy so, desmarcar "Excluir" na tela nao bloquearia
-- nada — a policy de editar ja autorizaria o delete. Por isso os modulos que
-- tem a acao "excluir" ganham policies separadas por operacao.
--
-- Os defaults de criar/editar/excluir sao identicos em todos estes modulos,
-- entao o comportamento efetivo continua o mesmo de antes.

-- ---------- RETIROS ----------
drop policy if exists "retiros_write_lideranca" on retiros;
create policy "retiros_insert" on retiros
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('retiros', 'criar'));
create policy "retiros_update" on retiros
  for update using (comunidade_id = auth_comunidade_id() and auth_pode('retiros', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('retiros', 'editar'));
create policy "retiros_delete" on retiros
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('retiros', 'excluir'));

-- ---------- CELULAS ----------
drop policy if exists "celulas_write_lideranca" on celulas;
create policy "celulas_insert" on celulas
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('celulas', 'criar'));
create policy "celulas_update" on celulas
  for update using (comunidade_id = auth_comunidade_id() and auth_pode('celulas', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('celulas', 'editar'));
create policy "celulas_delete" on celulas
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('celulas', 'excluir'));

-- ---------- FINANCEIRO ----------
drop policy if exists "financeiro_select_lideranca" on financeiro;
create policy "financeiro_select_lideranca" on financeiro
  for select using (comunidade_id = auth_comunidade_id() and auth_pode('financeiro', 'ver'));

drop policy if exists "financeiro_write_lideranca" on financeiro;
create policy "financeiro_insert" on financeiro
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('financeiro', 'criar'));
create policy "financeiro_update" on financeiro
  for update using (comunidade_id = auth_comunidade_id() and auth_pode('financeiro', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('financeiro', 'editar'));
create policy "financeiro_delete" on financeiro
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('financeiro', 'excluir'));

-- ---------- MENSAGENS ----------
drop policy if exists "mensagens_insert_lideranca" on mensagens_enviadas;
create policy "mensagens_insert_lideranca" on mensagens_enviadas
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('mensagens', 'criar'));

drop policy if exists "mensagens_templates_write_lideranca" on mensagens_templates;
create policy "mensagens_templates_insert" on mensagens_templates
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('mensagens', 'criar'));
create policy "mensagens_templates_update" on mensagens_templates
  for update using (comunidade_id = auth_comunidade_id() and auth_pode('mensagens', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('mensagens', 'editar'));
create policy "mensagens_templates_delete" on mensagens_templates
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('mensagens', 'excluir'));

-- ---------- PESSOAS ----------
-- Alem do dono, o supervisor agora enxerga as pessoas de quem esta abaixo dele.
drop policy if exists "pessoas_select" on pessoas;
create policy "pessoas_select" on pessoas
  for select using (
    comunidade_id = auth_comunidade_id() and (
      ((cadastrado_por = auth.uid() or responsavel_id = auth.uid()) and auth_pode('pessoas', 'ver'))
      or auth_supervisiona(responsavel_id)
      or auth_pode('pessoas_todas', 'ver')
    )
  );

drop policy if exists "pessoas_insert" on pessoas;
create policy "pessoas_insert" on pessoas
  for insert with check (
    comunidade_id = auth_comunidade_id() and auth_pode('pessoas', 'criar')
  );

drop policy if exists "pessoas_update" on pessoas;
create policy "pessoas_update" on pessoas
  for update using (
    comunidade_id = auth_comunidade_id() and (
      ((cadastrado_por = auth.uid() or responsavel_id = auth.uid()) and auth_pode('pessoas', 'editar'))
      or auth_pode('pessoas_todas', 'editar')
    )
  );

drop policy if exists "pessoas_delete_admin" on pessoas;
create policy "pessoas_delete_admin" on pessoas
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('pessoas_todas', 'excluir'));

drop policy if exists "pessoa_retiros_all" on pessoa_retiros;
create policy "pessoa_retiros_all" on pessoa_retiros
  for all using (
    pessoa_id in (
      select id from pessoas
      where comunidade_id = auth_comunidade_id()
      and (
        ((cadastrado_por = auth.uid() or responsavel_id = auth.uid()) and auth_pode('pessoas', 'editar'))
        or auth_pode('pessoas_todas', 'editar')
      )
    )
  );

drop policy if exists "pessoa_interacoes_all" on pessoa_interacoes;
create policy "pessoa_interacoes_all" on pessoa_interacoes
  for all using (
    pessoa_id in (
      select id from pessoas
      where comunidade_id = auth_comunidade_id()
      and (
        ((cadastrado_por = auth.uid() or responsavel_id = auth.uid()) and auth_pode('pessoas', 'editar'))
        or auth_pode('pessoas_todas', 'editar')
      )
    )
  );

-- ---------- MINISTERIOS ----------
drop policy if exists "ministerios_write_lideranca" on ministerios;
create policy "ministerios_insert" on ministerios
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('ministerios', 'criar'));
create policy "ministerios_update" on ministerios
  for update using (comunidade_id = auth_comunidade_id() and auth_pode('ministerios', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('ministerios', 'editar'));
create policy "ministerios_delete" on ministerios
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('ministerios', 'excluir'));

-- Tabelas-filhas do ministerio (membros, caixa) seguem a permissao de editar
-- o ministerio: mexer nelas e editar o ministerio, nao excluir o modulo.
drop policy if exists "ministerio_membros_write" on ministerio_membros;
create policy "ministerio_membros_write" on ministerio_membros
  for all using (
    ministerio_id in (select id from ministerios where comunidade_id = auth_comunidade_id())
    and auth_pode('ministerios', 'editar')
  );

drop policy if exists "ministerio_financeiro_write" on ministerio_financeiro;
create policy "ministerio_financeiro_write" on ministerio_financeiro
  for all using (comunidade_id = auth_comunidade_id() and auth_pode('ministerios', 'editar'));

-- ---------- PASTORAL ----------
-- O supervisor passa a enxergar as ovelhas dos pastores abaixo dele.
-- ATENCAO: isso vale so para pastoral_ovelhas (nome, etapa, situacao).
-- pastoral_encontros continua restrito ao proprio pastor, porque e la que
-- moram relato, temas_abordados e nivel_abertura. A confidencialidade do
-- acompanhamento continua intacta — o supervisor ve que existe e como vai,
-- nao o que foi dito.
drop policy if exists "pastoral_ovelhas_select" on pastoral_ovelhas;
create policy "pastoral_ovelhas_select" on pastoral_ovelhas
  for select using (
    comunidade_id = auth_comunidade_id() and (
      (pastor_id = auth.uid() and auth_pode('pastoral', 'ver'))
      or auth_supervisiona(pastor_id)
      or auth_pode('pastoral_todas', 'ver')
    )
  );

drop policy if exists "pastoral_ovelhas_write" on pastoral_ovelhas;
create policy "pastoral_ovelhas_write" on pastoral_ovelhas
  for all using (
    comunidade_id = auth_comunidade_id() and (
      (pastor_id = auth.uid() and auth_pode('pastoral', 'editar'))
      or auth_pode('pastoral_todas', 'editar')
    )
  )
  with check (
    comunidade_id = auth_comunidade_id() and (
      (pastor_id = auth.uid() and auth_pode('pastoral', 'criar'))
      or auth_pode('pastoral_todas', 'editar')
    )
  );

-- Encontros guardam relato/temas/nivel_abertura. Aqui NAO entra
-- auth_supervisiona(): o supervisor ve que o acompanhamento existe e como
-- vai (via pastoral_ovelhas e da view de monitoria), nunca o que foi dito.
drop policy if exists "pastoral_encontros_select" on pastoral_encontros;
create policy "pastoral_encontros_select" on pastoral_encontros
  for select using (
    (pastor_id = auth.uid() and auth_pode('pastoral', 'ver'))
    or auth_pode('pastoral_todas', 'ver')
  );

drop policy if exists "pastoral_encontros_write" on pastoral_encontros;
create policy "pastoral_encontros_write" on pastoral_encontros
  for all using (
    (pastor_id = auth.uid() and auth_pode('pastoral', 'editar'))
    or auth_pode('pastoral_todas', 'editar')
  )
  with check (
    (pastor_id = auth.uid() and auth_pode('pastoral', 'criar'))
    or auth_pode('pastoral_todas', 'editar')
  );

drop policy if exists "pastoral_presencas_all" on pastoral_presencas;
create policy "pastoral_presencas_all" on pastoral_presencas
  for all using (
    ovelha_id in (
      select id from pastoral_ovelhas
      where comunidade_id = auth_comunidade_id()
      and (
        (pastor_id = auth.uid() and auth_pode('pastoral', 'editar'))
        or auth_pode('pastoral_todas', 'editar')
      )
    )
  );

drop policy if exists "pastoral_objetivos_all" on pastoral_objetivos;
create policy "pastoral_objetivos_all" on pastoral_objetivos
  for all using (
    ovelha_id in (
      select id from pastoral_ovelhas
      where (pastor_id = auth.uid() and auth_pode('pastoral', 'editar'))
         or auth_pode('pastoral_todas', 'editar')
    )
  );

drop policy if exists "pastoral_frutos_all" on pastoral_frutos;
create policy "pastoral_frutos_all" on pastoral_frutos
  for all using (
    ovelha_id in (
      select id from pastoral_ovelhas
      where (pastor_id = auth.uid() and auth_pode('pastoral', 'editar'))
         or auth_pode('pastoral_todas', 'editar')
    )
  );

-- ---------- EQUIPE ----------
drop policy if exists "equipe_write" on equipe_cargos;
create policy "equipe_insert" on equipe_cargos
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('equipe', 'criar'));
create policy "equipe_update" on equipe_cargos
  for update using (comunidade_id = auth_comunidade_id() and auth_pode('equipe', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('equipe', 'editar'));
create policy "equipe_delete" on equipe_cargos
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('equipe', 'excluir'));

-- ---------- TIPOS DE EVENTO (configuracoes) ----------
drop policy if exists "tipos_evento_write" on tipos_evento_comunidade;
create policy "tipos_evento_write" on tipos_evento_comunidade
  for all using (comunidade_id = auth_comunidade_id() and auth_pode('configuracoes', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('configuracoes', 'editar'));

-- ---------- AGENDA ----------
-- Só a escrita virou auth_pode(). O SELECT continua com perfil literal de
-- proposito: la o perfil nao é permissao de modulo, e sim o publico-alvo do
-- evento (visivel_para = 'lideranca' / 'missionarios'), que é dado do
-- registro, nao configuracao de acesso.
drop policy if exists "agenda_eventos_write" on agenda_eventos;
create policy "agenda_eventos_insert" on agenda_eventos
  for insert with check (comunidade_id = auth_comunidade_id() and auth_pode('agenda', 'criar'));
create policy "agenda_eventos_update" on agenda_eventos
  for update using (comunidade_id = auth_comunidade_id() and auth_pode('agenda', 'editar'))
  with check (comunidade_id = auth_comunidade_id() and auth_pode('agenda', 'editar'));
create policy "agenda_eventos_delete" on agenda_eventos
  for delete using (comunidade_id = auth_comunidade_id() and auth_pode('agenda', 'excluir'));

-- ---------- MONITORIA PASTORAL (view) ----------
-- Mesmas colunas de antes (nenhuma sensivel entra aqui). Muda so o filtro:
-- alem de coordenador/admin, o supervisor direto/indireto do pastor tambem
-- passa a ver as metricas de quem esta abaixo dele.
create or replace view pastoral_ovelhas_resumo
with (security_invoker = off) as
select
  o.id,
  o.pastor_id,
  o.comunidade_id,
  o.nome,
  o.telefone,
  o.etapa_formacao,
  o.estado_espiritual,
  o.frequencia_acompanhamento,
  o.proxima_reuniao,
  o.ativo,
  (select count(*) from pastoral_encontros e where e.ovelha_id = o.id) as total_encontros,
  (select count(*) from pastoral_encontros e where e.ovelha_id = o.id and e.data >= current_date - 30)
    as encontros_ultimo_mes,
  (select max(e.data) from pastoral_encontros e where e.ovelha_id = o.id) as ultimo_encontro,
  current_date - (select max(e.data) from pastoral_encontros e where e.ovelha_id = o.id) as dias_sem_encontro
  -- NAO inclui: relato, encaminhamentos, nivel_abertura, temas_abordados
from pastoral_ovelhas o
where o.comunidade_id = auth_comunidade_id()
  and (auth_pode('monitoria', 'ver') or auth_supervisiona(o.pastor_id));

grant select on pastoral_ovelhas_resumo to authenticated;
