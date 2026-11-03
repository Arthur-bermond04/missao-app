import {
  Rocket,
  IdCard,
  Network,
  Users,
  Filter,
  Users2,
  HandHeart,
  Calendar,
  HeartHandshake,
  Gauge,
  Tent,
  Bell,
  MessageCircle,
  Wallet,
  BarChart3,
  Settings,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { pluralizar } from '@/lib/terminologia';
import type { DiagramaId } from '@/components/guia/Diagramas';
import type { Perfil, Terminologia } from '@/types/database';

export interface GuiaPasso {
  titulo: string;
  texto: string;
}

export interface GuiaErro {
  problema: string;
  solucao: string;
}

export interface GuiaSecao {
  /** Identificador estável (âncora da URL e chave do progresso salvo). */
  id: string;
  titulo: string;
  icon: LucideIcon;
  /** Chave em permissoes_modulos. Vazio = todo mundo vê. A seção só aparece se o perfil puder "ver" o módulo. */
  modulo: string;
  /** Rota do módulo, para o botão "Abrir". */
  href?: string;
  resumo: string;
  paraQuemE: string;
  /** Tempo estimado de leitura e prática. */
  tempo: string;
  /** Desenho que explica o mecanismo do módulo. */
  diagrama?: DiagramaId;
  /** Bloco interativo extra, renderizado depois do diagrama. */
  extra?: 'matriz';
  antes: string[];
  passos: GuiaPasso[];
  resultado: string;
  erros: GuiaErro[];
  dicas: string[];
  /** ids de outras seções para continuar a leitura. */
  relacionados: string[];
}

// Os textos usam a terminologia da comunidade (Grupo/Célula, Pastoral/
// Acompanhamento etc.) como o resto do painel, para o guia falar do mesmo
// jeito que o menu. Cada seção carrega o `modulo` do RLS: quem não tem acesso
// a um módulo também não vê o tutorial dele, e cada perfil lê só o que usa.
//
// Os rótulos de botão e de campo citados aqui foram conferidos nas telas
// (por exemplo "Nova pessoa", "Registrar abordagem", "Dividir em grupos").
// Se uma tela mudar de texto, atualize aqui.
export function montarGuia(t: Terminologia): GuiaSecao[] {
  const celula = t.modulo_celulas;
  const celulas = pluralizar(celula);
  const ovelha = t.nome_ovelha.toLowerCase();
  const pastor = t.nome_pastor.toLowerCase();

  return [
    {
      id: 'comecando',
      titulo: 'Começando',
      icon: Rocket,
      modulo: '',
      href: '/dashboard',
      resumo: 'Como o painel é organizado e por onde começar.',
      paraQuemE: 'Todos os perfis.',
      tempo: '5 min',
      diagrama: 'mapa',
      antes: ['Um e-mail e uma senha de acesso. Se ainda não tem, peça a um coordenador ou admin que convide você.'],
      passos: [
        {
          titulo: 'Entre no sistema',
          texto: 'Acesse o endereço do painel e faça login. No primeiro acesso, troque a senha temporária pela sua em Configurações › Segurança.',
        },
        {
          titulo: 'Conheça o menu lateral (1)',
          texto:
            'Os módulos ficam agrupados por assunto: Pessoas, Evangelização, Grupos e encontros, Acompanhamento, Eventos, Gestão e Sistema. Você só vê os módulos que o seu perfil pode usar.',
        },
        {
          titulo: 'Use a busca (2)',
          texto: 'Aperte Ctrl+K ou clique em "Buscar...". Digite o nome de uma tela, de um módulo ou de uma pessoa e vá direto ao resultado.',
        },
        {
          titulo: 'Passe o mouse nos itens do menu',
          texto: 'Cada item mostra uma linha explicando o que o módulo faz.',
        },
        {
          titulo: 'Olhe o sino e o "Para fazer" (3)',
          texto: 'Eles concentram avisos e pendências do dia, sem você precisar entrar módulo por módulo.',
        },
        {
          titulo: 'Comece pelo Dashboard',
          texto: 'É a visão geral da missão. Cada bloco dele só mostra dados dos módulos que você pode acessar.',
        },
      ],
      resultado: 'Você sabe se localizar no painel, achar qualquer tela em segundos e onde ficam os avisos.',
      erros: [
        {
          problema: 'Um módulo que um colega usa não aparece no meu menu.',
          solucao: 'O menu respeita o seu perfil. Peça a um admin para conferir a sua permissão em Configurações › Permissões.',
        },
        {
          problema: 'A tela ficou estreita e o menu só mostra ícones.',
          solucao: 'Use o botão no topo do menu para expandir ou recolher. Em telas pequenas o menu abre pelo ícone de três linhas.',
        },
      ],
      dicas: [
        'O botão no topo do menu recolhe a barra lateral para ganhar espaço.',
        'Seu nome e perfil ficam no canto inferior esquerdo (6); ali você troca a senha e sai do sistema.',
      ],
      relacionados: ['perfis', 'pessoas'],
    },
    {
      id: 'perfis',
      titulo: 'Perfis e permissões',
      icon: ShieldCheck,
      modulo: '',
      href: '/configuracoes',
      resumo: 'Quem pode ver e fazer o quê, e como isso é garantido pelo banco.',
      paraQuemE: 'Todos os perfis entendem; só o admin edita a matriz.',
      tempo: '8 min',
      diagrama: 'permissoes',
      extra: 'matriz',
      antes: ['Saber qual é o seu perfil: ele aparece embaixo do seu nome, no canto inferior esquerdo do menu.'],
      passos: [
        {
          titulo: 'Entenda os 5 perfis',
          texto:
            'Missionário, Líder, Coordenador, Padre e Admin. Cada pessoa tem um perfil, e o perfil define os módulos e as ações liberadas.',
        },
        {
          titulo: 'Leia as 4 ações',
          texto: 'Para cada módulo existem Ver, Criar, Editar e Excluir. "Ver" também decide se o item aparece no menu.',
        },
        {
          titulo: 'Distinga escopo próprio e ampliado',
          texto:
            'Em Pessoas, Evangelização e Acompanhamento, todo perfil acessa o que ele mesmo criou ou de que é responsável. Agir sobre registros de outras pessoas é uma permissão separada (módulos terminados em "_todas" ou "_todos").',
        },
        {
          titulo: 'Consulte a matriz ao vivo',
          texto: 'A tabela abaixo do desenho é lida do seu banco, já com os ajustes da sua comunidade. Procure a sua coluna, destacada.',
        },
        {
          titulo: 'Ajuste as permissões (só admin)',
          texto: 'Em Configurações › Permissões o admin marca ou desmarca as ações de cada perfil. O ajuste vale só para a sua comunidade.',
        },
      ],
      resultado: 'Você sabe explicar por que um módulo aparece ou some, e o admin sabe onde mudar isso com segurança.',
      erros: [
        {
          problema: 'Desmarquei "Ver" e a pessoa ainda consegue abrir a tela pelo endereço.',
          solucao:
            'Em membros, equipe, retiros, ministérios, grupos, comunicação, agenda e configurações, "Ver" só esconde o item do menu: a leitura segue liberada para a comunidade, porque esses dados aparecem em outras telas. O bloqueio real de leitura existe em funil, financeiro, pessoas, pastoral e monitoria.',
        },
        {
          problema: 'O admin desmarcou a própria permissão e se trancou.',
          solucao: 'Não acontece: a gestão da tabela de permissões exige o perfil admin de forma fixa no banco, de propósito.',
        },
      ],
      dicas: [
        'A permissão vale para o perfil inteiro, nunca para uma pessoa isolada.',
        'Se o valor escolhido voltar a ser igual ao padrão do sistema, o ajuste é apagado e a comunidade volta a acompanhar mudanças futuras do padrão.',
      ],
      relacionados: ['membros', 'equipe'],
    },
    {
      id: 'pessoas',
      titulo: 'Pessoas',
      icon: IdCard,
      modulo: 'pessoas',
      href: '/pessoas',
      resumo: 'O cadastro central de todo mundo que passa pela comunidade.',
      paraQuemE:
        'Todos os perfis veem as pessoas que cadastraram ou de que são responsáveis. Coordenador e admin veem as de outros responsáveis.',
      tempo: '7 min',
      diagrama: 'jornada',
      antes: ['Nenhum. É o melhor ponto de partida: quase tudo no sistema aponta para uma pessoa cadastrada aqui.'],
      passos: [
        {
          titulo: 'Abra Pessoas',
          texto: 'No topo há três números: Total de pessoas, Contatos vencidos e Novas esta semana. Os vencidos pedem ação.',
        },
        {
          titulo: 'Busque antes de criar',
          texto: 'No campo "Buscar" digite o nome ou o telefone. Se a pessoa já existe, abra o cadastro dela em vez de criar outro.',
        },
        {
          titulo: 'Cadastre com "Nova pessoa"',
          texto: 'O botão fica no topo da página. Preencha os dados básicos e salve.',
        },
        {
          titulo: 'Filtre a lista',
          texto: 'Use Etapa da jornada, Interesse, Origem e Próximo contato para montar listas de trabalho, por exemplo "interessados com contato vencido".',
        },
        {
          titulo: 'Abra a pessoa e leia as abas',
          texto: 'Resumo, dados pessoais, interações e histórico. É a ficha completa de uma pessoa.',
        },
        {
          titulo: 'Registre cada contato como interação',
          texto: 'Anote conversas e combinados na aba de interações. Quem assumir a pessoa depois sabe o que já foi feito.',
        },
      ],
      resultado: 'Cada pessoa existe uma única vez, com a etapa correta, o responsável e o histórico de contatos.',
      erros: [
        {
          problema: 'A mesma pessoa apareceu duas vezes.',
          solucao: 'Use a aba de duplicatas em Configurações para encontrar e unir os cadastros repetidos.',
        },
        {
          problema: 'Não vejo uma pessoa que um colega cadastrou.',
          solucao: 'É o escopo próprio: você vê o que cadastrou ou de que é responsável. Ver as de outros responsáveis exige a permissão ampliada (coordenador e admin têm).',
        },
      ],
      dicas: ['Cadastre uma vez: a mesma pessoa aparece no funil, nos grupos, nos retiros e no acompanhamento.', 'Defina o "Próximo contato" para o sistema avisar quando vencer.'],
      relacionados: ['funil', 'pastoral'],
    },
    {
      id: 'equipe',
      titulo: 'Equipe',
      icon: Network,
      modulo: 'equipe',
      href: '/equipe',
      resumo: 'A estrutura, os cargos e os níveis da comunidade.',
      paraQuemE: 'Todos veem; coordenador e admin criam e editam cargos.',
      tempo: '4 min',
      diagrama: 'hierarquia',
      antes: ['As pessoas já devem estar cadastradas ou convidadas, para poder atribuir cargos.'],
      passos: [
        { titulo: 'Abra Equipe', texto: 'Veja os cargos e como a estrutura está organizada. Use "Buscar por nome ou cargo" para achar alguém.' },
        { titulo: 'Crie um cargo', texto: 'Use o botão de novo cargo, dê um nome, escolha o nível e a pessoa.' },
        { titulo: 'Encerre quando a função acabar', texto: '"Encerrar cargo" mantém o histórico de quem ocupou a função.' },
        { titulo: 'Exclua só em caso de erro', texto: '"Excluir permanentemente" apaga o registro de vez, sem volta. Prefira encerrar.' },
      ],
      resultado: 'A estrutura reflete a realidade e quem supervisiona quem fica claro para o sistema.',
      erros: [
        {
          problema: 'Quero que um coordenador veja o trabalho dos líderes dele.',
          solucao: 'Defina o supervisor de cada pessoa ao editar o membro. A visão passa a descer em cascata pela hierarquia. O sistema recusa ciclos, como A supervisionar B e B supervisionar A.',
        },
      ],
      dicas: ['Encerrar é quase sempre melhor que excluir: você não perde a história da comunidade.'],
      relacionados: ['membros', 'perfis'],
    },
    {
      id: 'membros',
      titulo: t.modulo_membros,
      icon: Users,
      modulo: 'membros',
      href: '/membros',
      resumo: 'Quem tem login no sistema, com perfil e status.',
      paraQuemE: 'Todos veem; coordenador e admin convidam e editam.',
      tempo: '6 min',
      diagrama: 'convite',
      antes: [
        'Perfil de admin ou coordenador.',
        'O nome, o e-mail e o perfil que a pessoa deve ter.',
        'A chave de serviço do Supabase configurada no servidor (quem instalou o sistema cuida disso).',
      ],
      passos: [
        { titulo: `Abra ${t.modulo_membros}`, texto: 'A lista mostra nome, perfil, contatos cadastrados, último acesso e status.' },
        { titulo: 'Filtre a lista', texto: 'Use "Buscar por nome" e os filtros de perfil e de ministério.' },
        {
          titulo: 'Clique em "Convidar membro"',
          texto: 'Informe nome, e-mail e perfil e confirme em "Criar acesso".',
        },
        {
          titulo: 'Copie a senha temporária',
          texto: 'O sistema mostra a senha uma única vez. Copie e entregue à pessoa por um canal seguro.',
        },
        { titulo: 'Edite ou desative', texto: '"Editar" muda perfil e dados. "Desativar" tira o acesso sem apagar o histórico.' },
        { titulo: 'Exporte', texto: '"Exportar Excel" baixa a lista atual.' },
      ],
      resultado: 'A pessoa entra com o perfil certo, vê só o que deve e a lista mostra o status de cada acesso.',
      erros: [
        {
          problema: 'O convite deu erro de "não autenticado" ou "sessão inválida".',
          solucao: 'A chave de serviço do servidor está ausente ou incorreta. Quem instalou o sistema precisa configurá-la e reiniciar.',
        },
        { problema: 'Já existe uma conta com esse e-mail.', solucao: 'O e-mail já foi usado. Procure a pessoa na lista, ou use outro endereço.' },
        { problema: 'Perdi a senha temporária.', solucao: 'Ela não pode ser exibida de novo. Use a recuperação de senha na tela de login ("esqueci a senha").' },
      ],
      dicas: ['Escolha o perfil com cuidado: ele define tudo o que a pessoa vai enxergar.', 'Peça para a pessoa trocar a senha temporária no primeiro acesso.'],
      relacionados: ['perfis', 'equipe'],
    },
    {
      id: 'funil',
      titulo: t.modulo_funil,
      icon: Filter,
      modulo: 'funil',
      href: '/funil',
      resumo: 'Abordagens e primeiros contatos, acompanhando cada um pelas etapas da jornada.',
      paraQuemE:
        'Missionários e demais perfis em campo. Cada um edita os próprios contatos; líder, coordenador e admin editam os de outros.',
      tempo: '6 min',
      diagrama: 'jornada',
      antes: ['Nenhum. Tenha em mãos nome, telefone e onde a abordagem aconteceu.'],
      passos: [
        { titulo: `Abra ${t.modulo_funil}`, texto: 'A tela "Funil de Evangelização" mostra os contatos organizados por etapa da jornada.' },
        {
          titulo: 'Use "Registrar abordagem"',
          texto: 'Preencha Nome, Telefone, Idade, Nível de interesse (quente, morno ou frio), Local da abordagem, Data e, se quiser, Observações.',
        },
        {
          titulo: 'Avance a pessoa no funil',
          texto: `Abra o contato e mude a etapa conforme ela evolui: ${celula}, retiro, ${t.etapa_cv} e ${t.etapa_cal}.`,
        },
        {
          titulo: 'Filtre por local, missionário e data',
          texto: 'Os filtros "Local / região", "Missionário" e "Até" ajudam a planejar a próxima saída a campo.',
        },
        {
          titulo: 'Olhe os contatos travados',
          texto: 'O sistema destaca quem está parado há tempo demais. Retome o contato antes que esfrie.',
        },
      ],
      resultado: 'Nenhuma abordagem se perde: cada contato tem etapa, interesse e responsável, e os números do dashboard refletem a realidade.',
      erros: [
        {
          problema: 'Não consigo editar o contato de outro missionário.',
          solucao: 'Editar contatos alheios exige a permissão ampliada (líder, coordenador e admin têm). Peça a um deles.',
        },
        {
          problema: 'Atingi o limite de contatos do plano.',
          solucao: 'Um aviso aparece no dashboard. Veja as opções em Configurações › Plano.',
        },
      ],
      dicas: ['Atualize a etapa logo depois do contato: é o que mantém o dashboard confiável.', 'Quente, morno e frio ajudam a priorizar quem chamar primeiro.'],
      relacionados: ['pessoas', 'celulas'],
    },
    {
      id: 'celulas',
      titulo: celulas,
      icon: Users2,
      modulo: 'celulas',
      href: '/celulas',
      resumo: `Encontros semanais em grupo, com presença coletiva (${celulas}).`,
      paraQuemE: 'Todos veem; líder, coordenador e admin criam e editam.',
      tempo: '5 min',
      diagrama: 'ciclo-grupo',
      antes: ['O líder do grupo já deve ser um membro com acesso ao sistema.'],
      passos: [
        { titulo: `Abra ${celulas}`, texto: 'Use "Buscar por nome ou líder" para achar um grupo.' },
        {
          titulo: `Crie ${celula.toLowerCase()}`,
          texto: 'No formulário informe o Líder responsável, o Dia da semana, o Horário e o Endereço.',
        },
        { titulo: 'Registre cada encontro', texto: 'Depois da reunião, abra o grupo, registre o encontro e marque quem esteve presente.' },
        { titulo: 'Consulte o histórico', texto: 'O histórico de encontros mostra a frequência de cada pessoa ao longo do tempo.' },
      ],
      resultado: 'Você tem a frequência real de cada pessoa e enxerga cedo quem começou a faltar.',
      erros: [
        {
          problema: 'O líder que eu quero não aparece na busca.',
          solucao: 'Só membros com acesso entram. Convide a pessoa antes em ' + t.modulo_membros + '.',
        },
      ],
      dicas: ['Registre a presença no mesmo dia, enquanto todos se lembram de quem veio.'],
      relacionados: ['funil', 'pastoral'],
    },
    {
      id: 'ministerios',
      titulo: 'Ministérios',
      icon: HandHeart,
      modulo: 'ministerios',
      href: '/ministerios',
      resumo: 'Times de serviço e formação, com membros, presença, caixa e doações.',
      paraQuemE: 'Todos veem; coordenador e admin criam e editam.',
      tempo: '5 min',
      diagrama: 'ministerio',
      antes: ['Para usar Caixa e Doações, a comunidade precisa estar no plano Missão.'],
      passos: [
        { titulo: 'Abra Ministérios', texto: 'A lista mostra os times existentes.' },
        { titulo: 'Crie um ministério', texto: 'Use o botão de novo ministério e dê um nome.' },
        { titulo: 'Cadastre os membros', texto: 'Na aba Membros adicione quem serve no time.' },
        { titulo: 'Agende e registre encontros', texto: 'Use "Agendar próxima reunião" e, depois, registre o encontro para marcar a presença na aba Presença.' },
        { titulo: 'Controle o caixa e as doações', texto: 'As abas Caixa e Doações lançam entradas e saídas do ministério (plano Missão).' },
      ],
      resultado: 'Cada time tem membros, frequência e, se o plano permitir, caixa e doadores sob controle.',
      erros: [
        {
          problema: 'As abas Caixa e Doações mostram "Disponível no plano Missão".',
          solucao: 'A comunidade está no plano Semente. Use "Ver planos" para conhecer o upgrade.',
        },
      ],
      dicas: ['Use o filtro por ministério em Membros para ver quem serve em cada time.'],
      relacionados: ['financeiro', 'membros'],
    },
    {
      id: 'agenda',
      titulo: 'Agenda',
      icon: Calendar,
      modulo: 'agenda',
      href: '/agenda',
      resumo: 'O calendário de eventos da comunidade.',
      paraQuemE: 'Todos veem; coordenador, padre e admin criam e editam.',
      tempo: '3 min',
      antes: ['Nenhum. Para ver também a agenda do Google, o admin informa o endereço em Configurações.'],
      passos: [
        { titulo: 'Abra Agenda', texto: 'Veja os próximos eventos. A seção "Agenda externa" mostra o calendário integrado, se houver.' },
        {
          titulo: 'Crie com "Novo evento"',
          texto: 'Preencha Título, Data, Horário, Local, Tipo e Visível para (quem pode ver). A descrição é opcional.',
        },
        { titulo: 'Ajuste quando mudar', texto: 'Abra o evento para corrigir data, local ou descrição. Excluir pede confirmação.' },
      ],
      resultado: 'Todos enxergam os eventos certos, e cada evento aparece só para quem deve.',
      erros: [{ problema: 'Não vejo o botão de novo evento.', solucao: 'Criar eventos é permissão de coordenador, padre e admin.' }],
      dicas: ['Retiros têm tela própria, com inscrições e vagas, em Retiros.'],
      relacionados: ['retiros'],
    },
    {
      id: 'pastoral',
      titulo: t.modulo_pastoral,
      icon: HeartHandshake,
      modulo: 'pastoral',
      href: '/pastoral',
      resumo: `${t.nome_pastor}es acompanham ${ovelha}s específicas, uma a uma.`,
      paraQuemE: 'Cada pessoa vê só os próprios acompanhamentos; o admin vê todos. É conteúdo confidencial.',
      tempo: '8 min',
      diagrama: 'pastoral',
      antes: [`A pessoa a ser acompanhada precisa estar cadastrada em Pessoas: o vínculo é obrigatório.`],
      passos: [
        { titulo: `Abra ${t.modulo_pastoral}`, texto: `Veja as ${ovelha}s sob o seu cuidado, com o estado de cada uma: Crescendo, Em atenção ou Em risco.` },
        {
          titulo: 'Inicie um acompanhamento',
          texto: `Use a opção para adicionar uma pessoa ao seu acompanhamento pastoral e escolha o cadastro dela.`,
        },
        { titulo: 'Registre cada encontro', texto: 'Anote a data e o que for importante. Só você e quem tem acesso total leem isso.' },
        { titulo: 'Defina objetivos e frutos', texto: 'Objetivos orientam o cuidado; frutos registram o que já floresceu. Juntos mostram a evolução.' },
        { titulo: 'Acompanhe a agenda', texto: '"Próximas reuniões (7 dias)" lista o que vem aí e "Gargalos" aponta quem precisa de atenção.' },
        { titulo: 'Transfira se necessário', texto: `Se outro ${pastor} assumir, transfira o acompanhamento. O histórico fica.` },
      ],
      resultado: 'Cada pessoa tem alguém cuidando dela, com histórico, metas e um estado claro.',
      erros: [
        {
          problema: 'Não consigo vincular uma pessoa.',
          solucao: 'Ela ainda não existe em Pessoas. Cadastre antes e volte.',
        },
        {
          problema: 'Um coordenador não vê o conteúdo dos meus encontros.',
          solucao: 'É de propósito. O coordenador vê só números agregados, no painel de monitoria.',
        },
      ],
      dicas: ['Conteúdo pastoral é sensível: não compartilhe prints das telas desse módulo.', 'O registro de acessos mostra quem alterou o quê, mas nunca copia o conteúdo confidencial.'],
      relacionados: ['monitoria', 'pessoas'],
    },
    {
      id: 'monitoria',
      titulo: t.modulo_monitoria,
      icon: Gauge,
      modulo: 'monitoria',
      href: '/pastoral/monitoria',
      resumo: 'Métricas agregadas para quem coordena, sem acesso ao conteúdo dos encontros.',
      paraQuemE: 'Coordenador e admin.',
      tempo: '4 min',
      diagrama: 'pastoral',
      antes: ['Perfil de coordenador ou admin.'],
      passos: [
        { titulo: `Abra ${t.modulo_monitoria}`, texto: 'Veja os indicadores do acompanhamento da comunidade inteira.' },
        { titulo: 'Leia as tendências', texto: 'Compare períodos para perceber onde os encontros estão diminuindo ou um objetivo está parado.' },
        { titulo: 'Aja por meio da liderança', texto: `Converse com os responsáveis. O conteúdo individual continua reservado a cada ${pastor}.` },
      ],
      resultado: 'Você coordena o cuidado pelos números, sem invadir a confidencialidade.',
      erros: [{ problema: 'Quero ver o que foi conversado.', solucao: 'Não é possível, por desenho. Peça ao responsável pelo acompanhamento.' }],
      dicas: ['Este painel mostra números, nunca o que foi conversado.'],
      relacionados: ['pastoral', 'alertas'],
    },
    {
      id: 'retiros',
      titulo: 'Retiros',
      icon: Tent,
      modulo: 'retiros',
      href: '/retiros',
      resumo: 'Inscrição, vagas, check-in e divisão em grupos.',
      paraQuemE: 'Todos veem; coordenador e admin criam e editam.',
      tempo: '8 min',
      diagrama: 'retiro',
      antes: ['A chave de serviço do Supabase configurada no servidor, para a inscrição pública funcionar.'],
      passos: [
        { titulo: 'Abra Retiros', texto: 'Cada retiro mostra Vagas preenchidas e Arrecadação.' },
        { titulo: 'Crie um retiro', texto: 'Use o botão de novo retiro e informe nome, datas e número de vagas.' },
        { titulo: 'Divulgue a inscrição', texto: 'Cada retiro tem um link público e um QR Code para compartilhar.' },
        { titulo: 'Envie lembretes', texto: 'Use a opção de lembrete para avisar os inscritos.' },
        { titulo: 'Faça o check-in', texto: 'No dia, use "Buscar inscrito para check-in..." e marque quem chegou.' },
        { titulo: 'Divida em grupos', texto: 'Escolha em quantos grupos dividir e use "Dividir em grupos".' },
        { titulo: 'Leve os inscritos ao sistema', texto: 'Em cada inscrito use "Cadastrar em Pessoas", "Ver em Pessoas" ou "Adicionar ao acompanhamento pastoral".' },
      ],
      resultado: 'O retiro termina com presença registrada, grupos formados e os participantes incorporados ao cadastro.',
      erros: [
        {
          problema: 'O link público de inscrição não abre ou não grava.',
          solucao: 'A chave de serviço do servidor não está configurada. Quem instalou o sistema precisa preenchê-la.',
        },
        { problema: 'Inscrito repetido.', solucao: 'Confira se a pessoa já existe em Pessoas antes de cadastrar.' },
      ],
      dicas: ['O estado do retiro vai de Aberto para Encerrado e Realizado.', 'Relatórios traz um relatório próprio de retiro.'],
      relacionados: ['pessoas', 'agenda'],
    },
    {
      id: 'alertas',
      titulo: 'Alertas',
      icon: Bell,
      modulo: 'alertas',
      href: '/alertas',
      resumo: 'O que precisa de atenção agora.',
      paraQuemE: 'Coordenador e admin.',
      tempo: '3 min',
      diagrama: 'alertas',
      antes: ['Perfil de coordenador ou admin.'],
      passos: [
        { titulo: 'Abra Alertas', texto: 'Eles vêm em três níveis: URGENTE, ATENÇÃO e INFORMATIVO.' },
        { titulo: 'Filtre por assunto', texto: 'Os filtros são Todos, Urgentes, Pastoral, Pessoas, Ministérios, Financeiro e Comunicação.' },
        { titulo: 'Resolva e marque como visto', texto: 'Abra o alerta, resolva a pendência e marque como visto para ele sair da sua lista.' },
      ],
      resultado: 'Você começa o dia sabendo o que não pode esperar.',
      erros: [{ problema: 'Marquei como visto por engano.', solucao: 'O alerta sai só da sua lista de pendências. Os dados que o geraram continuam no módulo de origem.' }],
      dicas: ['O sino no topo também avisa quando há novidades.'],
      relacionados: ['monitoria', 'pessoas'],
    },
    {
      id: 'mensagens',
      titulo: 'Comunicação',
      icon: MessageCircle,
      modulo: 'mensagens',
      href: '/mensagens',
      resumo: 'Avisos para a equipe, com modelos e histórico.',
      paraQuemE: 'Todos veem; coordenador e admin criam e enviam.',
      tempo: '4 min',
      diagrama: 'comunicacao',
      antes: ['Perfil de coordenador ou admin.'],
      passos: [
        { titulo: 'Abra Comunicação', texto: 'O Histórico lista as mensagens anteriores.' },
        { titulo: 'Escolha um modelo', texto: 'Comece de um modelo pronto ou escreva do zero.' },
        { titulo: 'Preencha a Nova mensagem', texto: 'Informe Canal, Destinatários (e Qual ministério, se for o caso), Título e Mensagem.' },
        { titulo: 'Agende, se quiser', texto: 'O campo "Agendar para (opcional)" define quando a mensagem sai.' },
        { titulo: 'Confira a prévia e envie', texto: 'Revise o texto antes de confirmar.' },
      ],
      resultado: 'A mensagem fica registrada e visível no histórico.',
      erros: [
        {
          problema: 'A mensagem foi registrada, mas ninguém recebeu no celular.',
          solucao: 'O disparo real por push, WhatsApp e e-mail ainda não está integrado. Hoje o módulo só registra a mensagem no banco.',
        },
      ],
      dicas: ['Veja o estado das integrações em Configurações › Integrações.'],
      relacionados: ['configuracoes'],
    },
    {
      id: 'financeiro',
      titulo: 'Financeiro',
      icon: Wallet,
      modulo: 'financeiro',
      href: '/financeiro',
      resumo: 'Receitas, despesas, metas e o consolidado com os caixas dos ministérios.',
      paraQuemE: 'Coordenador e admin.',
      tempo: '6 min',
      diagrama: 'financeiro',
      antes: ['Perfil de coordenador ou admin.', 'As categorias financeiras e a meta mensal, definidas em Configurações.'],
      passos: [
        { titulo: 'Abra Financeiro', texto: 'No topo veja Receita, Despesa e Saldo do período.' },
        { titulo: 'Lance uma receita ou despesa', texto: 'Use o botão de novo lançamento e informe valor, categoria e data.' },
        { titulo: 'Filtre o período e a categoria', texto: 'Os filtros ajudam a conferir um mês ou um tipo de gasto.' },
        { titulo: 'Acompanhe a meta', texto: '"Meta de arrecadação do mês" compara o realizado com o objetivo.' },
        { titulo: 'Veja onde o dinheiro vai', texto: '"Despesas por categoria" mostra a distribuição dos gastos.' },
        { titulo: 'Confira os caixas dos ministérios', texto: 'A seção "Caixas de ministérios" soma ao "Total consolidado" (plano Missão).' },
      ],
      resultado: 'Você sabe quanto entrou, quanto saiu, quanto falta para a meta e o total consolidado.',
      erros: [
        { problema: 'Lancei errado.', solucao: 'Use "Excluir lançamento" (pede confirmação) e lance de novo. O saldo se ajusta.' },
        { problema: 'Não aparece o caixa dos ministérios.', solucao: 'Depende do plano Missão.' },
      ],
      dicas: ['Lance no dia em que o dinheiro entra ou sai; fica mais fácil de conferir depois.'],
      relacionados: ['ministerios', 'relatorios'],
    },
    {
      id: 'relatorios',
      titulo: 'Relatórios',
      icon: BarChart3,
      modulo: 'relatorios',
      href: '/relatorios',
      resumo: 'Análises e exportações da comunidade.',
      paraQuemE: 'Coordenador e admin.',
      tempo: '3 min',
      antes: ['Perfil de coordenador ou admin.'],
      passos: [
        { titulo: 'Abra Relatórios', texto: 'Escolha o tipo: evangelização, pastoral, ministério, retiro ou financeiro.' },
        { titulo: 'Defina o recorte', texto: 'Ajuste os filtros de período e de escopo.' },
        { titulo: 'Exporte', texto: 'Baixe em Excel ou PDF para compartilhar.' },
      ],
      resultado: 'Um arquivo pronto para reunião ou prestação de contas.',
      erros: [{ problema: 'O relatório veio com menos dados do que eu esperava.', solucao: 'Os relatórios respeitam as permissões: só entra o que o seu perfil pode ver.' }],
      dicas: ['O relatório pastoral não traz o conteúdo confidencial dos encontros.'],
      relacionados: ['financeiro', 'pastoral'],
    },
    {
      id: 'configuracoes',
      titulo: 'Configurações',
      icon: Settings,
      modulo: 'configuracoes',
      href: '/configuracoes',
      resumo: 'Comunidade, plano, permissões, segurança, notificações e integrações.',
      paraQuemE: 'Todos veem a tela; só o admin edita a comunidade e as permissões.',
      tempo: '6 min',
      diagrama: 'permissoes',
      antes: ['Perfil de admin para editar.'],
      passos: [
        { titulo: 'Abra Configurações', texto: 'As abas reúnem Comunidade, Plano, Permissões, Notificações, Segurança, Integrações, Financeiro e Duplicatas.' },
        { titulo: 'Personalize os nomes', texto: 'Na aba da comunidade ajuste os termos do menu, como Grupo ou Célula, e outros nomes.' },
        { titulo: 'Defina as permissões', texto: 'Na aba Permissões marque o que cada perfil pode fazer.' },
        { titulo: 'Confira o plano', texto: 'Veja os limites e recursos do plano atual: Semente, Missão ou Diocese.' },
        { titulo: 'Verifique as integrações', texto: 'A aba Integrações mostra o que já está conectado.' },
        { titulo: 'Troque sua senha', texto: 'Na aba de segurança você altera a própria senha.' },
      ],
      resultado: 'O sistema fala a língua da sua comunidade e cada perfil tem o acesso certo.',
      erros: [{ problema: 'Não consigo editar nada.', solucao: 'Editar configurações é permissão do admin.' }],
      dicas: ['Mudanças de permissão valem para todos os usuários daquele perfil.'],
      relacionados: ['perfis', 'arquitetura'],
    },
    {
      id: 'arquitetura',
      titulo: 'Como tudo se conecta',
      icon: Workflow,
      modulo: '',
      resumo: 'A visão técnica: onde ficam os dados, quem protege o quê e o que ainda falta integrar.',
      paraQuemE: 'Admin e quem responde pelo projeto (TI).',
      tempo: '6 min',
      diagrama: 'arquitetura',
      antes: ['Nenhum conhecimento técnico é exigido para ler; ajuda saber o que é um banco de dados.'],
      passos: [
        { titulo: 'Entenda as duas pontas', texto: 'O painel web é para líderes e coordenação. O aplicativo mobile é para os missionários em campo. Os dois usam o mesmo banco.' },
        { titulo: 'Entenda onde a segurança mora', texto: 'No banco. O RLS (segurança por linha) decide quem lê e escreve cada registro, com base na matriz de permissões. A interface só esconde botões por conveniência.' },
        { titulo: 'Entenda a chave de serviço', texto: 'Ela ignora o RLS e existe só no servidor, para tarefas como convidar membros e receber inscrições públicas. Nunca vai para o navegador nem para o app mobile.' },
        { titulo: 'Saiba o que falta integrar', texto: 'Push (Firebase), WhatsApp (Z-API) e e-mail (Resend) ainda não disparam mensagens reais.' },
      ],
      resultado: 'Você sabe diagnosticar se um problema é de permissão, de configuração do servidor ou de integração.',
      erros: [
        { problema: 'Algo funciona para mim e falha para outro perfil.', solucao: 'Quase sempre é a matriz de permissões. Compare as duas colunas na matriz ao vivo.' },
        { problema: 'Rotas do servidor respondem 401.', solucao: 'Confira a chave de serviço e se o usuário está logado e com perfil permitido.' },
      ],
      dicas: ['Guarde a chave de serviço em local seguro e gere uma nova se ela for exposta.'],
      relacionados: ['perfis', 'configuracoes'],
    },
  ];
}

// ---------------------------------------------------------------------------
// GLOSSÁRIO E PROBLEMAS COMUNS
// ---------------------------------------------------------------------------
export interface TermoGlossario {
  termo: string;
  definicao: string;
}

export function montarGlossario(t: Terminologia): TermoGlossario[] {
  return [
    { termo: 'Perfil', definicao: 'O papel de uma pessoa no sistema: missionário, líder, coordenador, padre ou admin.' },
    { termo: 'Módulo', definicao: 'Uma área do sistema, como Pessoas, Retiros ou Financeiro. Cada uma tem o seu item no menu.' },
    { termo: 'Ação', definicao: 'O que se pode fazer num módulo: ver, criar, editar ou excluir.' },
    { termo: 'Matriz de permissões', definicao: 'A tabela de perfil × módulo × ação que define o que cada perfil pode fazer.' },
    { termo: 'Override', definicao: 'Um ajuste da sua comunidade sobre o padrão do sistema. Ele vence o padrão.' },
    { termo: 'Escopo próprio', definicao: 'Os registros que você mesmo criou ou de que é responsável. Todo perfil acessa os seus.' },
    { termo: 'Escopo ampliado', definicao: 'Agir sobre registros de outras pessoas. É uma permissão separada (módulos "_todas" e "_todos").' },
    { termo: 'RLS', definicao: 'Segurança por linha, no banco de dados: o próprio banco recusa o que o perfil não pode ler ou escrever.' },
    { termo: 'Supervisor', definicao: 'A pessoa a quem alguém se reporta. Quem supervisiona enxerga, em cascata, os acompanhamentos de quem está abaixo.' },
    { termo: 'Etapa da jornada', definicao: 'Em que ponto da caminhada a pessoa está. No funil: abordagem, grupo, retiro, ' + t.etapa_cv + ' e ' + t.etapa_cal + '.' },
    { termo: t.etapa_cv, definicao: 'Uma etapa de formação da jornada. O nome é configurável em Configurações.' },
    { termo: t.etapa_cal, definicao: 'A etapa seguinte da formação. O nome também é configurável.' },
    { termo: t.nome_pastor, definicao: `Quem acompanha ${t.nome_ovelha.toLowerCase()}s, uma a uma, em ${t.modulo_pastoral}.` },
    { termo: t.nome_ovelha, definicao: `A pessoa acompanhada em ${t.modulo_pastoral}. Ela precisa estar cadastrada em Pessoas.` },
    { termo: 'Contato travado', definicao: 'Um contato do funil parado há tempo demais sem avançar de etapa.' },
    { termo: 'Nível de interesse', definicao: 'Quente, morno ou frio: o quanto a pessoa demonstrou interesse na abordagem.' },
    { termo: 'Plano', definicao: 'O pacote da comunidade: Semente, Missão ou Diocese. Define limites e recursos, como caixa de ministérios.' },
    { termo: 'Chave de serviço', definicao: 'Chave técnica do servidor que ignora o RLS. Serve para convidar membros e receber inscrições públicas.' },
  ];
}

export interface PerguntaFrequente {
  pergunta: string;
  resposta: string;
}

export const PERGUNTAS_FREQUENTES: PerguntaFrequente[] = [
  {
    pergunta: 'Não vejo um módulo que preciso.',
    resposta:
      'O menu mostra só o que o seu perfil pode ver. Peça a um admin para conferir a sua linha em Configurações › Permissões (ou olhe a matriz ao vivo na seção "Perfis e permissões" deste guia).',
  },
  {
    pergunta: 'Esqueci a senha.',
    resposta: 'Na tela de login use "esqueci a senha". Para trocar a senha logado, vá em Configurações › Segurança.',
  },
  {
    pergunta: 'O convite de membro dá erro.',
    resposta:
      'Duas causas comuns: a chave de serviço do servidor não está configurada (erro de não autenticado) ou o e-mail já tem conta. Só admin e coordenador podem convidar.',
  },
  {
    pergunta: 'O link de inscrição do retiro não funciona.',
    resposta: 'A inscrição pública depende da chave de serviço no servidor. Peça a quem instalou o sistema para configurá-la.',
  },
  {
    pergunta: 'As mensagens não chegam no celular.',
    resposta: 'O módulo Comunicação ainda só registra as mensagens. As integrações de push, WhatsApp e e-mail estão pendentes.',
  },
  {
    pergunta: 'Uma pessoa apareceu duplicada.',
    resposta: 'Use a aba de duplicatas em Configurações para encontrar e unir os cadastros repetidos.',
  },
  {
    pergunta: 'Posso apagar um cargo ou um lançamento por engano?',
    resposta:
      'Encerrar um cargo preserva o histórico; excluir apaga de vez. Excluir lançamento pede confirmação e altera o saldo. Prefira encerrar ou corrigir.',
  },
  {
    pergunta: 'Quem pode ver o conteúdo do acompanhamento pastoral?',
    resposta: 'Só o responsável por cada acompanhamento e o admin. Coordenadores veem apenas números agregados na monitoria.',
  },
  {
    pergunta: 'Troquei o nome de "Grupo" para "Célula" e o contrário. Os dados mudam?',
    resposta: 'Não. Só o rótulo exibido muda. Os dados guardados continuam os mesmos.',
  },
];

// ---------------------------------------------------------------------------
// TRILHAS POR FUNÇÃO
//
// A pessoa escolhe a função e o guia monta a trilha: os mesmos tutoriais, só
// os que importam para ela, na ordem em que vale a pena aprender. A trilha
// ainda é filtrada pelas permissões reais do perfil logado (ver GuiaPage).
// ---------------------------------------------------------------------------
export interface FuncaoTrilha {
  perfil: Perfil;
  titulo: string;
  descricao: string;
  secoes: string[];
}

export const FUNCOES_TRILHA: FuncaoTrilha[] = [
  {
    perfil: 'missionario',
    titulo: 'Missionário',
    descricao: 'Campo: cadastrar pessoas, registrar abordagens e acompanhar quem você evangeliza.',
    secoes: ['comecando', 'perfis', 'pessoas', 'funil', 'pastoral', 'agenda'],
  },
  {
    perfil: 'lider',
    titulo: 'Líder',
    descricao: 'Grupos e encontros: conduzir o grupo, registrar presença e cuidar de quem está sob sua liderança.',
    secoes: ['comecando', 'perfis', 'pessoas', 'funil', 'celulas', 'pastoral', 'ministerios', 'agenda'],
  },
  {
    perfil: 'coordenador',
    titulo: 'Coordenador',
    descricao: 'Gestão: equipe, convites, retiros, comunicação, financeiro, alertas e relatórios.',
    secoes: [
      'comecando', 'perfis', 'pessoas', 'equipe', 'membros', 'funil', 'celulas', 'ministerios',
      'pastoral', 'monitoria', 'retiros', 'agenda', 'alertas', 'mensagens', 'financeiro', 'relatorios',
    ],
  },
  {
    perfil: 'padre',
    titulo: 'Padre',
    descricao: 'Acompanhamento e agenda: cuidar das pessoas, dos grupos e dos eventos da comunidade.',
    secoes: ['comecando', 'perfis', 'pessoas', 'pastoral', 'agenda', 'celulas', 'ministerios', 'funil'],
  },
  {
    perfil: 'admin',
    titulo: 'Admin',
    descricao: 'Responsável pelo sistema: vê todos os módulos e configura permissões, termos e integrações.',
    secoes: [
      'comecando', 'perfis', 'configuracoes', 'arquitetura', 'membros', 'equipe', 'pessoas', 'funil', 'celulas',
      'ministerios', 'pastoral', 'monitoria', 'retiros', 'agenda', 'alertas', 'mensagens', 'financeiro', 'relatorios',
    ],
  },
];
