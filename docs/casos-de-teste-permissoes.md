# Casos de teste de RLS e permissões

O README já documenta como o sistema de permissões funciona (matriz
`permissoes` + `auth_pode()` + hierarquia de `supervisor_id`). O que falta —
apontado nas Pendências conhecidas — é uma suíte automatizada que autentique
como cada perfil e confira o que ele enxerga. Este documento é o passo antes
disso: os cenários escritos em prosa, para servirem de checklist manual hoje e
de roteiro de testes (por exemplo `pgTAP` ou requests autenticados via
Supabase JS contra um projeto de teste) quando a suíte for escrita.

Cada cenário cita a policy, função ou trigger que ele exercita, para facilitar
achar o código quando o teste falhar. Nenhum destes cenários foi automatizado
ainda — são o roteiro, não o resultado de uma execução.

## 1. Resolução da matriz (`auth_pode`)

- Perfil com override na própria comunidade permitindo uma ação que o default
  do sistema nega: `auth_pode()` retorna `true` (override vence default).
- Perfil sem override e sem default para aquele módulo/ação: `auth_pode()`
  retorna `false` (nega por padrão, nunca libera por omissão).
- Dois perfis diferentes na mesma comunidade, mesmo módulo: cada um resolve
  independentemente — dar `lider` acesso a `monitoria.ver` não muda o que
  `missionario` enxerga.
- Definir um override com o mesmo valor do default do sistema apaga a linha de
  override (`definirPermissao()` em `lib/permissoes.ts`) — a comunidade volta
  a acompanhar mudanças futuras no default em vez de ficar presa ao valor
  antigo.
- A ação `ver` só tem efeito real no `SELECT` de `funil`, `financeiro`,
  `pessoas`, `pessoas_todas`, `pastoral`, `pastoral_todas` e `monitoria`.
  Desmarcar `ver` em `celulas`, `membros`, `retiros`, `ministerios`,
  `mensagens`, `agenda` ou `configuracoes` esconde o item do menu mas **não**
  bloqueia o `SELECT` dessas tabelas — outras telas dependem de ler esses
  dados via join (nome do responsável, ministério do membro, retiro da
  inscrição).

## 2. Override por comunidade

- Comunidade A libera `lider` para `monitoria.ver`; comunidade B não. Um
  líder da comunidade A vê a tela de Monitoria; o mesmo perfil na comunidade B
  continua bloqueado (a linha de override tem `comunidade_id` e não vaza entre
  comunidades — `permissoes_select` filtra por `auth_comunidade_id()`).
- Um admin da comunidade A não consegue alterar (`UPDATE`/`INSERT`) uma linha
  de `permissoes` com `comunidade_id` da comunidade B (`permissoes_write_admin`
  exige `comunidade_id = auth_comunidade_id()`).
- Ninguém — nem admin — edita ou apaga uma linha de default do sistema
  (`comunidade_id is null`); `permissoes_write_admin` só cobre linhas com
  `comunidade_id = auth_comunidade_id()`.
- Qualquer perfil autenticado consegue ler a matriz inteira (defaults +
  override da própria comunidade), mesmo sem nenhuma permissão concedida —
  senão o app não teria como montar o menu (`permissoes_select`).
- Um não-admin tenta gravar em `permissoes` (mesmo dentro da própria
  comunidade): rejeitado, porque `permissoes_write_admin` checa
  `auth_perfil() = 'admin'` como literal — de propósito, para um admin não
  poder se trancar para fora do sistema desmarcando a própria permissão via
  `auth_pode()`.

## 3. Hierarquia de supervisão (`supervisor_id`, `auth_supervisiona`)

- Coordenador vê a ovelha de um pastor que está diretamente abaixo dele na
  hierarquia (`pastoral_ovelhas_select`, via `auth_supervisiona(pastor_id)`),
  mesmo sem `pastoral_todas.ver`.
- Coordenador vê a ovelha de um pastor **dois níveis** abaixo (subordinado do
  subordinado) — `auth_subordinados()` é recursiva (`with recursive`).
- Coordenador **não** vê a ovelha de um pastor que não está na sua cadeia de
  supervisão e não tem `pastoral_todas.ver`.
- **Coordenador NÃO vê o relato do encontro do subordinado**: `auth_supervisiona()`
  entra em `pastoral_ovelhas_select`, mas não em `pastoral_encontros_select` —
  o supervisor enxerga que o encontro existe e as métricas agregadas
  (`pastoral_ovelhas_resumo`), nunca `relato`, `temas_abordados` nem
  `nivel_abertura`.
- A mesma checagem vale para `pastoral_presencas`, `pastoral_objetivos` e
  `pastoral_frutos`: essas tabelas só liberam por `pastor_id = auth.uid()` ou
  `pastoral_todas.editar` — nunca por `auth_supervisiona()`.
- Supervisor vê, na view `pastoral_ovelhas_resumo`, as métricas
  (`encontros_ultimo_mes`, `dias_sem_encontro`) dos pastores abaixo dele, sem
  nenhuma coluna de conteúdo do relato aparecer na view.
- Supervisor vê as pessoas cujo `responsavel_id` é um subordinado seu
  (`pessoas_select`, via `auth_supervisiona(responsavel_id)`), mesmo sem
  `pessoas_todas.ver`.
- **Ciclo na hierarquia de `supervisor_id` é rejeitado**: tentar definir A como
  supervisor de B quando B já é (direta ou indiretamente) supervisor de A
  falha com exceção (`trg_usuarios_valida_supervisor` /
  `usuarios_valida_supervisor()`).
- Um usuário não pode ser definido como supervisor de si mesmo
  (`new.supervisor_id = new.id` levanta exceção).
- Uma cadeia de supervisão muito profunda (auto-referência não detectada por
  ciclo real, mas laço de mais de 50 saltos) é rejeitada pelo limite de
  segurança do trigger, não trava o banco.
- Remover o `supervisor_id` de alguém no meio de uma cadeia (ex: excluir esse
  usuário) não derruba a hierarquia dos que restaram: a FK usa
  `on delete set null`, então os subordinados diretos desse usuário passam a
  não ter supervisor, mas não geram erro nem ficam órfãos de forma inválida.

## 4. Escopo próprio vs. escopo ampliado (módulos `_todas` / `_todos`)

- Missionário sem `funil_todos.editar` não consegue atualizar um contato cujo
  `missionario_id` é de outro missionário (`contatos_update_proprio_ou_lideranca`).
- Missionário sempre edita o próprio contato (`missionario_id = auth.uid()`)
  contanto que tenha `funil.editar` — independente de `funil_todos`.
- Líder com `funil_todos.editar` (default) consegue editar contato de
  qualquer missionário da comunidade, mesmo não sendo o dono.
- Ninguém exclui um contato sem `funil_todos.excluir` — nem o próprio
  missionário que o criou (`contatos_delete_lideranca` não tem caminho de
  dono, só o escopo ampliado).
- Dono de uma pessoa (`cadastrado_por = auth.uid()` ou `responsavel_id = auth.uid()`)
  sempre vê/edita seu próprio cadastro tendo só `pessoas.ver`/`pessoas.editar`
  — não precisa de `pessoas_todas`.
- Coordenador com `pessoas_todas.editar` edita pessoa cadastrada por outro
  missionário, mesmo não sendo dono nem supervisor dela.
- **`pessoas_todas.excluir` é `admin`-only por padrão**: um coordenador com
  `pessoas_todas.editar` (que ele tem por padrão) ainda assim não consegue
  fazer `DELETE` numa pessoa — `pessoas_delete_admin` checa
  `pessoas_todas.excluir` especificamente, uma ação separada de `editar`.
- Pastor sem `pastoral_todas.ver`/`.editar` só enxerga e só edita as próprias
  ovelhas (`pastor_id = auth.uid()`).
- `pastoral_todas` não tem ação `excluir` no catálogo de módulos — não existe
  hoje um caminho de `DELETE` de `pastoral_ovelhas` via matriz de permissões
  (a política é `for all` sobre `ver`/`editar` apenas); qualquer UI que ofereça
  "excluir ovelha" depende de outro controle (hoje, checagem hardcoded de
  `perfil === 'admin'` no componente — ver nota abaixo).

## 5. Auditoria (LGPD)

- Atualizar um campo em `pessoas` gera uma linha em `auditoria` com o valor
  antes/depois daquele campo especificamente, não a linha inteira.
- Inserir ou excluir uma linha em `pessoas`/`pastoral_ovelhas`/`usuarios`/
  `permissoes`/`financeiro`/`comunidades` gera um evento em `auditoria` do
  tipo correspondente.
- Atualizar `pastoral_encontros` **não** gera evento em `auditoria` — está
  fora de propósito (é a tabela do relato confidencial).
- Campos confidenciais que mudam (`relato`, `temas_abordados`,
  `nivel_abertura`, `encaminhamentos`, `observacoes`, `objetivo_atual`) entram
  no log como `(conteudo omitido)`, nunca com o valor de fato.
- Ninguém — nem admin, via API — consegue inserir, atualizar ou apagar uma
  linha de `auditoria` diretamente: a tabela não tem nenhuma policy de escrita,
  só é populada pelo trigger.
- Só quem tem `auditoria.ver` (admin por padrão) lê `/auditoria`; os demais
  perfis não veem o módulo no menu nem conseguem `SELECT` na tabela.

## 6. Multi-tenancy (isolamento por `comunidade_id`)

- Um usuário da comunidade A, mesmo com todas as permissões concedidas no
  perfil dele, nunca vê uma linha de `pessoas`, `pastoral_ovelhas`,
  `financeiro`, `celulas`, `contatos`, `retiros`, `ministerios` ou `agenda`
  cujo `comunidade_id` seja de outra comunidade — toda policy relevante
  filtra por `comunidade_id = auth_comunidade_id()` antes de checar
  `auth_pode()`.
- `auth_comunidade_id()` resolve para a comunidade do usuário autenticado;
  trocar o `comunidade_id` de um registro numa requisição forjada não muda
  qual comunidade é usada na checagem (ela vem do JWT/linha de `usuarios`, não
  do payload da requisição).

## 7. Confidencialidade específica de fluxo (não é RLS pura, mas depende dela)

- O lembrete enviado a um pastor em atraso (Monitoria › "Enviar lembrete") é
  genérico e não cita qual ovelha está atrasada — mesmo que quem envia
  enxergue `dias_sem_encontro` da ovelha via `pastoral_ovelhas_resumo`, essa
  informação não deveria vazar para o pastor através da mensagem
  (`LembreteModal` em `pastoral/monitoria/page.tsx`).
- A tela de Monitoria, ao abrir o painel de um pastor, mostra as ovelhas dele
  só com estado/datas — nunca o conteúdo de `pastoral_encontros`, mesmo que a
  RLS de `pastoral_ovelhas` já libere aquela linha para o supervisor.

## 8. Sincronização mobile × permissões (`contatos`)

- O app mobile grava em `contatos` usando o mesmo `auth.uid()`/RLS do web —
  desabilitar `funil.criar` para um perfil bloqueia a sincronização
  offline desse usuário tanto quanto bloquearia o cadastro pela tela web (a
  policy não distingue cliente).
- O trigger `contatos_gera_pessoa` roda como `security definer`: mesmo um
  perfil sem `pessoas.criar` consegue, indiretamente, gerar uma linha em
  `pessoas` ao sincronizar um `contato` — comportamento intencional (é o
  sistema criando o registro-espelho, não o usuário), mas vale confirmar que
  a pessoa criada assim carrega `cadastrado_por` do missionário do contato, não
  de um superusuário do trigger.

## 9. Gate de UI vs. gate de RLS (front não é fonte da verdade)

Estes casos não testam o banco, testam a consistência entre o app e o banco —
relevantes porque o histórico deste projeto já teve páginas checando
`usuario.perfil` num array fixo em vez de `pode()` (ver commit que corrigiu
`pastoral/monitoria`, `agenda` e `celulas`):

- Uma tela nunca deve exibir uma ação (botão, link) que a RLS vai recusar —
  cada gate de UI (`pode('modulo', 'acao')`) precisa corresponder à mesma
  dupla módulo/ação que a policy de escrita daquela tabela usa.
- O inverso também é bug: uma tela não deve esconder uma ação que a RLS
  permitiria — é o que aconteceu com `PERFIS_GESTAO` fixo em
  `pastoral/monitoria/page.tsx` (um supervisor autorizado pelo banco via
  `auth_supervisiona()` não conseguia nem abrir a tela).
- Checagens de perfil como literal (`usuario.perfil === 'admin'`) que
  permanecem no código (hoje: exclusão de pessoa em `pessoas/[id]`, exclusão
  de ovelha em `pastoral/[id]`, abas de Permissões/Duplicatas em
  Configurações) devem ser revisadas uma a uma: algumas espelham um módulo
  real da matriz e deveriam virar `pode()` (ex: `pessoas_todas.excluir`);
  outras são propositalmente hardcoded (a própria gestão de `permissoes`, e
  qualquer ação sem uma dupla módulo/ação correspondente no catálogo, como o
  "excluir ovelha" citado no item 4).
