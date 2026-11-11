import { labelEtapaJornada, labelEtapaJornadaPessoa } from '@/lib/terminologia';
import type { EtapaJornada, EtapaJornadaPessoa, Terminologia } from '@/types/database';
import { Bolinha, Caixa, Quadro, Rotulo, Seta } from './svg';

export type DiagramaId =
  | 'mapa'
  | 'permissoes'
  | 'hierarquia'
  | 'jornada'
  | 'convite'
  | 'ciclo-grupo'
  | 'ministerio'
  | 'pastoral'
  | 'retiro'
  | 'alertas'
  | 'comunicacao'
  | 'financeiro'
  | 'arquitetura';

interface Props {
  t: Terminologia;
}

// ---------------------------------------------------------------------------
// 1. Mapa da tela — o esqueleto que se repete em todo o painel
// ---------------------------------------------------------------------------
function Mapa() {
  const id = 'mapa';
  return (
    <Quadro id={id} largura={720} altura={330} titulo="Mapa da tela do painel: menu lateral, barra superior e área de conteúdo">
      <rect x={0} y={0} width={720} height={250} rx={10} className="fill-content-bg stroke-border" />
      {/* menu lateral */}
      <rect x={0} y={0} width={150} height={250} rx={10} className="fill-sidebar-bg" />
      <rect x={14} y={14} width={70} height={10} rx={5} className="fill-sidebar-text-active" />
      <rect x={14} y={38} width={122} height={22} rx={6} className="fill-white/10" />
      {[78, 100, 122, 144, 166, 188].map((y, i) => (
        <rect key={y} x={14} y={y} width={i === 1 ? 110 : 92} height={12} rx={6} className={i === 1 ? 'fill-accent-green' : 'fill-sidebar-text'} opacity={i === 1 ? 1 : 0.55} />
      ))}
      <circle cx={30} cy={228} r={11} className="fill-white/20" />
      <rect x={48} y={218} width={70} height={8} rx={4} className="fill-sidebar-text-active" />
      <rect x={48} y={231} width={44} height={6} rx={3} className="fill-sidebar-text" />
      {/* barra superior */}
      <rect x={150} y={0} width={570} height={34} className="fill-topbar-bg" />
      <rect x={166} y={13} width={150} height={8} rx={4} className="fill-sidebar-text" opacity={0.6} />
      <circle cx={668} cy={17} r={8} className="fill-sidebar-text" opacity={0.7} />
      <circle cx={696} cy={17} r={8} className="fill-sidebar-text" opacity={0.7} />
      {/* conteúdo */}
      <rect x={170} y={52} width={160} height={14} rx={4} className="fill-text-primary" opacity={0.8} />
      <rect x={170} y={72} width={230} height={8} rx={4} className="fill-text-secondary" opacity={0.5} />
      <rect x={170} y={96} width={160} height={64} rx={8} className="fill-bg-card stroke-border" />
      <rect x={346} y={96} width={160} height={64} rx={8} className="fill-bg-card stroke-border" />
      <rect x={522} y={96} width={176} height={64} rx={8} className="fill-bg-card stroke-border" />
      <rect x={170} y={174} width={528} height={64} rx={8} className="fill-bg-card stroke-border" />
      <rect x={586} y={46} width={112} height={26} rx={5} className="fill-primary" />
      <Bolinha x={75} y={110} n={1} />
      <Bolinha x={75} y={49} n={2} />
      <Bolinha x={690} y={17} n={3} />
      <Bolinha x={642} y={59} n={4} />
      <Bolinha x={430} y={206} n={5} />
      <Bolinha x={75} y={228} n={6} />
      <Rotulo x={0} y={278} forte cor="fill-text-primary">Legenda</Rotulo>
      <Rotulo x={0} y={296}>1 Menu lateral: só os módulos que o seu perfil pode ver</Rotulo>
      <Rotulo x={0} y={312}>2 Busca (Ctrl+K): vai direto a uma tela ou pessoa</Rotulo>
      <Rotulo x={380} y={296}>3 Sino e &quot;Para fazer&quot;: avisos e pendências</Rotulo>
      <Rotulo x={380} y={312}>4 Botão principal da tela (criar, convidar, exportar)</Rotulo>
      <Rotulo x={380} y={328}>5 Conteúdo   6 Seu nome e perfil (trocar senha e sair)</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 2. Como a permissão chega até o dado
// ---------------------------------------------------------------------------
function Permissoes() {
  const id = 'perm';
  return (
    <Quadro id={id} largura={720} altura={290} titulo="Fluxo de permissão: usuário, perfil, matriz, regra do banco e dados liberados">
      <Caixa x={0} y={20} w={125} h={56} tom="cinza" titulo="Pessoa logada" linhas={['entra com e-mail', 'e senha']} />
      <Caixa x={148} y={20} w={125} h={56} tom="verde" titulo="Perfil" linhas={['cinco perfis, do', 'missionário ao admin']} />
      <Caixa x={296} y={20} w={125} h={56} tom="azul" titulo="Matriz" linhas={['perfil × módulo × ação', '(ver, criar, editar, excluir)']} />
      <Caixa x={444} y={20} w={125} h={56} tom="azul" titulo="auth_pode()" linhas={['função do banco', 'consulta a matriz']} />
      <Caixa x={592} y={20} w={128} h={56} tom="verde" titulo="Dados liberados" linhas={['só o que a regra permite']} />
      <Seta id={id} x1={125} y1={48} x2={148} y2={48} />
      <Seta id={id} x1={273} y1={48} x2={296} y2={48} />
      <Seta id={id} x1={421} y1={48} x2={444} y2={48} />
      <Seta id={id} x1={569} y1={48} x2={592} y2={48} verde />

      <Seta id={id} x1={358} y1={76} x2={358} y2={116} tracejada />
      <Caixa x={278} y={116} w={140} h={50} tom="cinza" titulo="Menu lateral" linhas={['só mostra se "Ver"']} />
      <Seta id={id} x1={506} y1={76} x2={506} y2={116} tracejada />
      <Caixa x={438} y={116} w={140} h={50} tom="cinza" titulo="RLS no Postgres" linhas={['bloqueia no banco']} />

      <Rotulo x={0} y={146} forte cor="fill-text-primary">Override</Rotulo>
      <Rotulo x={0} y={162}>A comunidade pode mudar a</Rotulo>
      <Rotulo x={0} y={176}>matriz. O ajuste vence o padrão.</Rotulo>

      <Rotulo x={0} y={216} forte cor="fill-text-primary">Dois escopos</Rotulo>
      <Caixa x={0} y={226} w={350} h={54} tom="verde" titulo="Escopo próprio" linhas={['todo perfil acessa o que ele mesmo criou ou de que é responsável']} tamanho={11.5} />
      <Caixa x={370} y={226} w={350} h={54} tom="ambar" titulo="Escopo ampliado (módulos _todas / _todos)" linhas={['agir sobre registros de outras pessoas é permissão à parte']} tamanho={11.5} />
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 3. Hierarquia de supervisão
// ---------------------------------------------------------------------------
function Hierarquia() {
  const id = 'hier';
  return (
    <Quadro id={id} largura={720} altura={300} titulo="Árvore de supervisão: admin, coordenador, líderes e missionários">
      <Caixa x={290} y={8} w={140} h={44} tom="verde" titulo="Admin" linhas={['vê tudo da comunidade']} />
      <Caixa x={290} y={80} w={140} h={44} tom="azul" titulo="Coordenador" linhas={['supervisiona a rede']} />
      <Caixa x={140} y={152} w={130} h={50} tom="ambar" titulo="Líder A" linhas={['supervisor_id aponta', 'para o Coordenador']} tamanho={11} />
      <Caixa x={450} y={152} w={130} h={50} tom="ambar" titulo="Líder B" linhas={['supervisor_id aponta', 'para o Coordenador']} tamanho={11} />
      <Caixa x={60} y={236} w={110} h={40} tom="cinza" titulo="Missionário 1" />
      <Caixa x={190} y={236} w={110} h={40} tom="cinza" titulo="Missionário 2" />
      <Caixa x={420} y={236} w={110} h={40} tom="cinza" titulo="Missionário 3" />
      <Caixa x={550} y={236} w={110} h={40} tom="cinza" titulo="Missionário 4" />
      <Seta id={id} x1={360} y1={52} x2={360} y2={80} />
      <Seta id={id} x1={330} y1={124} x2={225} y2={156} />
      <Seta id={id} x1={390} y1={124} x2={500} y2={156} />
      <Seta id={id} x1={190} y1={200} x2={120} y2={236} />
      <Seta id={id} x1={220} y1={200} x2={240} y2={236} />
      <Seta id={id} x1={500} y1={200} x2={475} y2={236} />
      <Seta id={id} x1={530} y1={200} x2={600} y2={236} />
      <Rotulo x={0} y={110} forte cor="fill-text-primary">Quem supervisiona</Rotulo>
      <Rotulo x={0} y={125}>enxerga, em cascata,</Rotulo>
      <Rotulo x={0} y={139}>os acompanhamentos de</Rotulo>
      <Rotulo x={0} y={153}>quem está abaixo.</Rotulo>
      <Rotulo x={555} y={80} forte cor="fill-text-primary">Proteção</Rotulo>
      <Rotulo x={555} y={95}>O banco recusa ciclos:</Rotulo>
      <Rotulo x={555} y={109}>A não pode supervisionar</Rotulo>
      <Rotulo x={555} y={123}>quem supervisiona A.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 4. Jornada da pessoa — duas trilhas que se complementam
// ---------------------------------------------------------------------------
const ETAPAS_FUNIL: EtapaJornada[] = ['abordagem', 'celula', 'retiro', 'cv', 'cal'];
const ETAPAS_PESSOA: EtapaJornadaPessoa[] = ['contato_inicial', 'interessado', 'participando', 'cv', 'cal', 'integrado', 'afastado'];

function Jornada({ t }: Props) {
  const id = 'jorn';
  return (
    <Quadro id={id} largura={720} altura={290} titulo="Jornada da pessoa: etapas do funil de campo e etapas do cadastro em Pessoas">
      <Rotulo x={0} y={14} forte cor="fill-text-primary">{`${t.modulo_funil} (campo): onde a pessoa já passou`}</Rotulo>
      {ETAPAS_FUNIL.map((e, i) => {
        const x = i * 150;
        return (
          <g key={e}>
            <Caixa x={x} y={26} w={120} h={50} tom={i === 0 ? 'azul' : 'verde'} titulo={labelEtapaJornada(e, t).replace(/^Integrados \((.*)\)$/, '$1')} linhas={[i === 0 ? 'primeiro contato' : i === 1 ? 'veio a um encontro' : i === 2 ? 'foi a um retiro' : i === 3 ? 'etapa de formação' : 'etapa seguinte']} />
            {i < ETAPAS_FUNIL.length - 1 && <Seta id={id} x1={x + 120} y1={51} x2={x + 150} y2={51} verde />}
          </g>
        );
      })}
      <Rotulo x={0} y={100}>Cada contato avança de etapa. Contato parado há muito tempo aparece como &quot;travado&quot;.</Rotulo>

      <Rotulo x={0} y={140} forte cor="fill-text-primary">Pessoas (cadastro central): em que ponto a pessoa está agora</Rotulo>
      {ETAPAS_PESSOA.map((e, i) => {
        const x = i * 105;
        const afastado = e === 'afastado';
        return (
          <g key={e}>
            <Caixa x={x} y={152} w={90} h={44} tom={afastado ? 'ambar' : e === 'integrado' ? 'verde' : 'cinza'} titulo={labelEtapaJornadaPessoa(e, t)} tamanho={10.5} />
            {i < ETAPAS_PESSOA.length - 2 && <Seta id={id} x1={x + 90} y1={174} x2={x + 105} y2={174} />}
          </g>
        );
      })}
      <Seta id={id} x1={615} y1={174} x2={630} y2={174} tracejada />
      <Rotulo x={0} y={226} forte cor="fill-text-primary">Regra de ouro</Rotulo>
      <Rotulo x={0} y={242}>Uma pessoa, um registro. Cadastre em Pessoas uma vez: ela aparece no funil, nos grupos, nos retiros e no acompanhamento.</Rotulo>
      <Rotulo x={0} y={258}>Antes de criar, busque o nome para não duplicar. A aba de duplicatas em Configurações ajuda a limpar depois.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 5. Convite de membro
// ---------------------------------------------------------------------------
function Convite() {
  const id = 'conv';
  const passos = [
    { t: 'Convidar membro', l: ['nome, e-mail,', 'perfil'], tom: 'verde' as const },
    { t: 'Servidor valida', l: ['só admin ou', 'coordenador'], tom: 'azul' as const },
    { t: 'Cria a conta', l: ['no Supabase Auth', 'com senha temporária'], tom: 'azul' as const },
    { t: 'Vincula', l: ['linha em usuarios:', 'comunidade + perfil'], tom: 'azul' as const },
    { t: 'Mostra a senha', l: ['uma única vez', 'na tela'], tom: 'ambar' as const },
    { t: 'Pessoa entra', l: ['e troca a senha', 'em Configurações'], tom: 'verde' as const },
  ];
  return (
    <Quadro id={id} largura={720} altura={190} titulo="Fluxo do convite de membro, do formulário ao primeiro acesso">
      {passos.map((p, i) => {
        const x = i * 123;
        return (
          <g key={p.t}>
            <Caixa x={x} y={20} w={105} h={64} tom={p.tom} titulo={p.t} linhas={p.l} tamanho={11} />
            {i < passos.length - 1 && <Seta id={id} x1={x + 105} y1={52} x2={x + 123} y2={52} verde />}
          </g>
        );
      })}
      <Rotulo x={0} y={116} forte cor="fill-text-primary">Se algo falhar no meio</Rotulo>
      <Rotulo x={0} y={132}>Se a conta nascer mas o vínculo falhar, o servidor apaga a conta recém-criada. Não sobra usuário &quot;órfão&quot; sem comunidade.</Rotulo>
      <Rotulo x={0} y={156} forte cor="fill-text-primary">Pré-requisito do servidor</Rotulo>
      <Rotulo x={0} y={172}>A chave de serviço do Supabase precisa estar configurada no servidor, senão o convite responde &quot;não autenticado&quot;.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 6. Ciclo semanal do grupo
// ---------------------------------------------------------------------------
function CicloGrupo({ t }: Props) {
  const id = 'cic';
  const passos = [
    { t: 'Agendar', l: ['dia, horário', 'e endereço'], tom: 'cinza' as const },
    { t: 'Reunião acontece', l: ['o grupo se encontra'], tom: 'cinza' as const },
    { t: 'Registrar encontro', l: ['data e presença', 'de cada pessoa'], tom: 'verde' as const },
    { t: 'Histórico', l: ['frequência ao longo', 'do tempo'], tom: 'azul' as const },
  ];
  return (
    <Quadro id={id} largura={720} altura={210} titulo={`Ciclo semanal de ${t.modulo_celulas}: agendar, reunir, registrar presença e consultar histórico`}>
      {passos.map((p, i) => {
        const x = i * 185;
        return (
          <g key={p.t}>
            <Caixa x={x} y={20} w={150} h={62} tom={p.tom} titulo={p.t} linhas={p.l} />
            {i < passos.length - 1 && <Seta id={id} x1={x + 150} y1={51} x2={x + 185} y2={51} verde />}
          </g>
        );
      })}
      <path d="M 625 82 L 625 124 L 75 124 L 75 86" fill="none" strokeWidth={1.5} strokeDasharray="4 3" className="stroke-text-secondary" markerEnd={`url(#${id}-seta)`} />
      <Rotulo x={350} y={118} ancora="middle">e na semana seguinte, de novo</Rotulo>
      <Rotulo x={0} y={156} forte cor="fill-text-primary">Hábito que sustenta os números</Rotulo>
      <Rotulo x={0} y={172}>Registre a presença no mesmo dia. O Dashboard e o Painel da Liderança usam esses dados para mostrar quem está se afastando.</Rotulo>
      <Rotulo x={0} y={192}>Cada grupo tem um líder responsável, um dia da semana, um horário e um endereço.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 7. Estrutura de um ministério
// ---------------------------------------------------------------------------
function Ministerio() {
  const id = 'min';
  return (
    <Quadro id={id} largura={720} altura={210} titulo="Estrutura de um ministério: abas de membros, presença, caixa e doações; caixa e doações dependem do plano">
      <Caixa x={270} y={8} w={180} h={46} tom="verde" titulo="Ministério" linhas={['time de serviço ou formação']} />
      <Caixa x={0} y={100} w={160} h={54} tom="cinza" titulo="Membros" linhas={['quem serve no time']} />
      <Caixa x={180} y={100} w={160} h={54} tom="cinza" titulo="Presença" linhas={['encontros e frequência']} />
      <Caixa x={380} y={100} w={160} h={54} tom="ambar" titulo="Caixa" linhas={['plano Missão']} tracejada />
      <Caixa x={560} y={100} w={160} h={54} tom="ambar" titulo="Doações" linhas={['plano Missão']} tracejada />
      <Seta id={id} x1={330} y1={54} x2={80} y2={100} />
      <Seta id={id} x1={345} y1={54} x2={260} y2={100} />
      <Seta id={id} x1={375} y1={54} x2={460} y2={100} />
      <Seta id={id} x1={390} y1={54} x2={640} y2={100} />
      <Rotulo x={0} y={184}>No plano Semente, Caixa e Doações aparecem bloqueadas. O lançamento do caixa entra no Financeiro, em &quot;Caixas de ministérios&quot;.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 8. Acompanhamento pastoral e a parede de privacidade
// ---------------------------------------------------------------------------
function Pastoral({ t }: Props) {
  const id = 'past';
  return (
    <Quadro id={id} largura={720} altura={270} titulo={`${t.modulo_pastoral}: registros individuais confidenciais e métricas agregadas na monitoria`}>
      <Caixa x={0} y={30} w={120} h={60} tom="cinza" titulo="Pessoa" linhas={['cadastro em Pessoas', '(obrigatório)']} tamanho={11.5} />
      <Caixa x={150} y={30} w={130} h={60} tom="verde" titulo={t.modulo_pastoral} linhas={[`1 ${t.nome_pastor.toLowerCase()}`, `1 ${t.nome_ovelha.toLowerCase()}`]} tamanho={11.5} />
      <Caixa x={310} y={14} w={170} h={92} tom="verde" titulo="Registros" linhas={['encontros individuais', 'objetivos', 'frutos']} tamanho={11.5} />
      <Seta id={id} x1={120} y1={60} x2={150} y2={60} verde />
      <Seta id={id} x1={280} y1={60} x2={310} y2={60} verde />

      <line x1={520} y1={4} x2={520} y2={200} strokeWidth={2} strokeDasharray="6 5" className="stroke-danger" />
      <Rotulo x={520} y={216} ancora="middle" forte cor="fill-danger">conteúdo confidencial</Rotulo>
      <Rotulo x={520} y={230} ancora="middle" cor="fill-danger">não atravessa esta linha</Rotulo>

      <Seta id={id} x1={480} y1={60} x2={560} y2={60} tracejada />
      <Rotulo x={512} y={50} ancora="end" tamanho={9.5}>só contagens</Rotulo>
      <Caixa x={560} y={30} w={160} h={60} tom="azul" titulo={t.modulo_monitoria} linhas={['métricas agregadas', 'coordenador e admin']} tamanho={11.5} />

      <Rotulo x={0} y={140} forte cor="fill-text-primary">Estado de cada acompanhamento</Rotulo>
      <Caixa x={0} y={152} w={130} h={34} tom="verde" titulo="Crescendo" tamanho={11.5} />
      <Caixa x={150} y={152} w={130} h={34} tom="ambar" titulo="Em atenção" tamanho={11.5} />
      <Caixa x={300} y={152} w={130} h={34} tom="vermelho" titulo="Em risco" tamanho={11.5} />
      <Rotulo x={0} y={214}>Cada pessoa vê só os próprios acompanhamentos. O admin enxerga todos.</Rotulo>
      <Rotulo x={0} y={230}>Quem coordena acompanha o cuidado pelos números, sem ler o que foi conversado.</Rotulo>
      <Rotulo x={0} y={246}>Transferir um acompanhamento muda o responsável sem perder o histórico.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 9. Ciclo de um retiro
// ---------------------------------------------------------------------------
function Retiro() {
  const id = 'ret';
  const passos = [
    { t: 'Criar retiro', l: ['nome, datas,', 'vagas'], tom: 'verde' as const },
    { t: 'Divulgar', l: ['link público', 'e QR Code'], tom: 'verde' as const },
    { t: 'Inscrições', l: ['a pessoa se', 'inscreve sozinha'], tom: 'azul' as const },
    { t: 'Lembretes', l: ['avisar os', 'inscritos'], tom: 'azul' as const },
    { t: 'Check-in', l: ['buscar o inscrito', 'e marcar presença'], tom: 'ambar' as const },
    { t: 'Dividir em grupos', l: ['escolha em', 'quantos grupos'], tom: 'ambar' as const },
  ];
  return (
    <Quadro id={id} largura={720} altura={250} titulo="Ciclo de um retiro: criar, divulgar, inscrever, lembrar, fazer check-in e dividir em grupos">
      {passos.map((p, i) => {
        const x = i * 123;
        return (
          <g key={p.t}>
            <Caixa x={x} y={16} w={105} h={64} tom={p.tom} titulo={p.t} linhas={p.l} tamanho={11} />
            {i < passos.length - 1 && <Seta id={id} x1={x + 105} y1={48} x2={x + 123} y2={48} verde />}
          </g>
        );
      })}
      <Rotulo x={0} y={112} forte cor="fill-text-primary">Estado do retiro</Rotulo>
      <Caixa x={0} y={122} w={150} h={34} tom="verde" titulo="Aberto" linhas={[]} tamanho={11.5} />
      <Caixa x={190} y={122} w={150} h={34} tom="ambar" titulo="Encerrado" tamanho={11.5} />
      <Caixa x={380} y={122} w={150} h={34} tom="cinza" titulo="Realizado" tamanho={11.5} />
      <Seta id={id} x1={150} y1={139} x2={190} y2={139} />
      <Seta id={id} x1={340} y1={139} x2={380} y2={139} />
      <Rotulo x={0} y={186} forte cor="fill-text-primary">Depois do check-in</Rotulo>
      <Rotulo x={0} y={202}>Cada inscrito tem atalhos: &quot;Ver em Pessoas&quot;, &quot;Cadastrar em Pessoas&quot; ou &quot;Adicionar ao acompanhamento pastoral&quot;.</Rotulo>
      <Rotulo x={0} y={226} forte cor="fill-text-primary">Atenção</Rotulo>
      <Rotulo x={0} y={242}>O formulário público de inscrição só funciona com a chave de serviço do Supabase configurada no servidor.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 10. Níveis de alerta
// ---------------------------------------------------------------------------
function Alertas() {
  const id = 'ale';
  return (
    <Quadro id={id} largura={720} altura={190} titulo="Níveis de alerta: urgente, atenção e informativo, e o que fazer com cada um">
      <Caixa x={0} y={14} w={220} h={70} tom="vermelho" titulo="URGENTE" linhas={['resolva primeiro', 'ex.: pessoa em risco']} />
      <Caixa x={250} y={14} w={220} h={70} tom="ambar" titulo="ATENÇÃO" linhas={['resolva esta semana', 'ex.: contato vencido']} />
      <Caixa x={500} y={14} w={220} h={70} tom="azul" titulo="INFORMATIVO" linhas={['só para ciência', 'ex.: novidade no sistema']} />
      <Seta id={id} x1={110} y1={84} x2={110} y2={116} />
      <Seta id={id} x1={360} y1={84} x2={360} y2={116} />
      <Seta id={id} x1={610} y1={84} x2={610} y2={116} />
      <Caixa x={0} y={116} w={720} h={40} tom="cinza" titulo="Abrir o alerta, resolver a pendência e marcar como visto: ele sai da lista" tamanho={11.5} />
      <Rotulo x={0} y={178}>Filtros: Todos, Urgentes, Pastoral, Pessoas, Ministérios, Financeiro e Comunicação.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 11. Comunicação — o que já funciona e o que ainda não
// ---------------------------------------------------------------------------
function Comunicacao() {
  const id = 'com';
  return (
    <Quadro id={id} largura={720} altura={200} titulo="Fluxo da comunicação: a mensagem é registrada no banco; o disparo real por push, WhatsApp e e-mail ainda não está conectado">
      <Caixa x={0} y={20} w={150} h={64} tom="verde" titulo="Nova mensagem" linhas={['canal, destinatários,', 'título e texto']} tamanho={11.5} />
      <Caixa x={190} y={20} w={130} h={64} tom="cinza" titulo="Agendar" linhas={['opcional']} tamanho={11.5} />
      <Caixa x={360} y={20} w={150} h={64} tom="azul" titulo="Registro no banco" linhas={['aparece no Histórico']} tamanho={11.5} />
      <Caixa x={550} y={20} w={170} h={64} tom="ambar" titulo="Disparo real" linhas={['push, WhatsApp, e-mail', 'ainda não conectado']} tracejada tamanho={11.5} />
      <Seta id={id} x1={150} y1={52} x2={190} y2={52} verde />
      <Seta id={id} x1={320} y1={52} x2={360} y2={52} verde />
      <Seta id={id} x1={510} y1={52} x2={550} y2={52} tracejada />
      <Rotulo x={0} y={124} forte cor="fill-text-primary">Estado atual</Rotulo>
      <Rotulo x={0} y={140}>Hoje o módulo guarda a mensagem e o histórico. Para chegar ao celular das pessoas, faltam as integrações</Rotulo>
      <Rotulo x={0} y={156}>com Firebase (push), Z-API (WhatsApp) e Resend (e-mail). O status delas fica em Configurações › Integrações.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 12. Financeiro
// ---------------------------------------------------------------------------
function Financeiro() {
  const id = 'fin';
  return (
    <Quadro id={id} largura={720} altura={250} titulo="Financeiro: receitas e despesas formam o saldo, comparado com a meta do mês; caixas de ministérios entram no consolidado">
      <Caixa x={0} y={14} w={150} h={50} tom="verde" titulo="Receita" linhas={['lançamentos']} />
      <Caixa x={0} y={84} w={150} h={50} tom="vermelho" titulo="Despesa" linhas={['lançamentos por categoria']} tamanho={11.5} />
      <Caixa x={220} y={44} w={150} h={64} tom="azul" titulo="Saldo do período" linhas={['receita menos despesa']} tamanho={11.5} />
      <Caixa x={440} y={14} w={150} h={50} tom="ambar" titulo="Meta do mês" linhas={['arrecadação']} />
      <Caixa x={440} y={84} w={150} h={50} tom="cinza" titulo="Despesas por categoria" linhas={['gráfico de pizza']} tamanho={11.5} />
      <Seta id={id} x1={150} y1={39} x2={220} y2={68} verde />
      <Seta id={id} x1={150} y1={109} x2={220} y2={86} />
      <Seta id={id} x1={370} y1={68} x2={440} y2={42} />
      <Seta id={id} x1={150} y1={124} x2={440} y2={118} tracejada />
      <Caixa x={0} y={170} w={190} h={46} tom="ambar" titulo="Caixas de ministérios" linhas={['plano Missão']} tracejada tamanho={11.5} />
      <Seta id={id} x1={190} y1={193} x2={250} y2={193} />
      <Caixa x={250} y={170} w={190} h={46} tom="verde" titulo="Total consolidado" linhas={['comunidade + ministérios']} tamanho={11.5} />
      <Rotulo x={470} y={186} forte cor="fill-text-primary">Cuidado</Rotulo>
      <Rotulo x={470} y={202}>Excluir um lançamento pede</Rotulo>
      <Rotulo x={470} y={216}>confirmação e altera o saldo.</Rotulo>
    </Quadro>
  );
}

// ---------------------------------------------------------------------------
// 13. Arquitetura (para quem responde pelo sistema)
// ---------------------------------------------------------------------------
function Arquitetura() {
  const id = 'arq';
  return (
    <Quadro id={id} largura={720} altura={330} titulo="Arquitetura do MissãoWeb: painel web, aplicativo mobile, Supabase e integrações">
      <Caixa x={0} y={14} w={190} h={64} tom="verde" titulo="Painel web" linhas={['Next.js, TypeScript', 'líderes e coordenação']} tamanho={11.5} />
      <Caixa x={0} y={186} w={190} h={64} tom="verde" titulo="App mobile" linhas={['Expo, React Native', 'missionários em campo']} tamanho={11.5} />
      <Caixa x={250} y={14} w={190} h={64} tom="azul" titulo="Rotas do servidor" linhas={['/api/membros/convidar', '/api/inscricao']} tamanho={11} />
      <Caixa x={250} y={104} w={190} h={146} tom="azul" titulo="Supabase" linhas={['Auth: login e contas', 'Postgres: os dados', 'RLS: quem lê e escreve', 'auth_pode(): a matriz']} tamanho={11.5} />
      <Seta id={id} x1={190} y1={46} x2={250} y2={46} />
      <Seta id={id} x1={190} y1={212} x2={250} y2={196} />
      <Seta id={id} x1={190} y1={66} x2={250} y2={116} />
      <Rotulo x={95} y={128} ancora="middle" tamanho={9.5}>direto, com a chave anon</Rotulo>
      <Rotulo x={95} y={141} ancora="middle" tamanho={9.5}>e a sessão do usuário</Rotulo>
      <Seta id={id} x1={345} y1={78} x2={345} y2={104} />
      <Rotulo x={356} y={95} tamanho={9.5}>chave de serviço</Rotulo>

      <Rotulo x={490} y={22} forte cor="fill-text-primary">Integrações</Rotulo>
      <Caixa x={490} y={32} w={230} h={40} tom="ambar" titulo="Firebase Cloud Messaging" linhas={['push, não conectado']} tracejada tamanho={11} />
      <Caixa x={490} y={82} w={230} h={40} tom="ambar" titulo="Z-API" linhas={['WhatsApp, não conectado']} tracejada tamanho={11} />
      <Caixa x={490} y={132} w={230} h={40} tom="ambar" titulo="Resend" linhas={['e-mail, não conectado']} tracejada tamanho={11} />
      <Caixa x={490} y={182} w={230} h={40} tom="cinza" titulo="SheetJS e pdfmake" linhas={['exportar Excel e PDF']} tamanho={11} />

      <Rotulo x={0} y={278} forte cor="fill-text-primary">Princípios</Rotulo>
      <Rotulo x={0} y={294}>A segurança fica no banco (RLS). A interface só decide o que mostrar: esconder um botão nunca é a proteção.</Rotulo>
      <Rotulo x={0} y={310}>A chave de serviço ignora o RLS e fica só no servidor, nunca no app mobile nem no navegador.</Rotulo>
    </Quadro>
  );
}

const DIAGRAMAS: Record<DiagramaId, (p: Props) => React.ReactElement> = {
  mapa: () => <Mapa />,
  permissoes: () => <Permissoes />,
  hierarquia: () => <Hierarquia />,
  jornada: (p) => <Jornada {...p} />,
  convite: () => <Convite />,
  'ciclo-grupo': (p) => <CicloGrupo {...p} />,
  ministerio: () => <Ministerio />,
  pastoral: (p) => <Pastoral {...p} />,
  retiro: () => <Retiro />,
  alertas: () => <Alertas />,
  comunicacao: () => <Comunicacao />,
  financeiro: () => <Financeiro />,
  arquitetura: () => <Arquitetura />,
};

export function Diagrama({ id, t }: { id: DiagramaId; t: Terminologia }) {
  return (
    <figure className="mt-4 overflow-x-auto rounded-md border border-border bg-bg-card p-3">
      <div className="min-w-[560px]">{DIAGRAMAS[id]({ t })}</div>
    </figure>
  );
}
