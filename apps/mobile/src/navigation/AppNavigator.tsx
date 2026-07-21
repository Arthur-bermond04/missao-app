import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Target, LayoutDashboard, Wallet, MessageCircle, User, IdCard, type LucideIcon } from 'lucide-react-native';

import { ListaContatosScreen } from '../screens/ListaContatosScreen';
import { PessoasScreen } from '../screens/PessoasScreen';
import { PessoaPerfilScreen } from '../screens/PessoaPerfilScreen';
import { CadastroContatoScreen } from '../screens/CadastroContatoScreen';
import { ConfirmacaoContatoScreen } from '../screens/ConfirmacaoContatoScreen';
import { PerfilContatoScreen } from '../screens/PerfilContatoScreen';
import { RetirosListScreen } from '../screens/RetirosListScreen';
import { NovoRetiroScreen } from '../screens/NovoRetiroScreen';
import { RetiroDetalheScreen } from '../screens/RetiroDetalheScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FunilScreen } from '../screens/FunilScreen';
import { MinisteriosScreen } from '../screens/MinisteriosScreen';
import { MinisterioDetalheScreen } from '../screens/MinisterioDetalheScreen';
import { PastoralScreen } from '../screens/PastoralScreen';
import { OvelhaDetalheScreen } from '../screens/OvelhaDetalheScreen';
import { FinanceiroScreen } from '../screens/FinanceiroScreen';
import { MensagensScreen } from '../screens/MensagensScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { AlterarSenhaScreen } from '../screens/AlterarSenhaScreen';

import { useAuth } from '../lib/useAuth';
import { contarLembretesHoje } from '../lib/usuarios';
import { colors } from '../theme/colors';
import type { Usuario } from '../types/database';

const PERFIS_GESTAO_RETIROS = ['coordenador', 'admin'];

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.gold,
  headerTitleStyle: { fontWeight: '700' as const },
};

// ---------------------------------------------------------------------------
// Aba Missão — mantém todas as telas de contatos e retiros já existentes
// (nomes de rota preservados para não quebrar os navigation.navigate atuais).
// ---------------------------------------------------------------------------
const MissaoStack = createNativeStackNavigator();

function MissaoStackNavigator({ usuario }: { usuario: Usuario }) {
  const comunidadeId = usuario.comunidade_id as string;
  const missionarioId = usuario.id;
  return (
    <MissaoStack.Navigator screenOptions={stackScreenOptions}>
      <MissaoStack.Screen
        name="ListaContatos"
        options={({ navigation }) => ({
          title: 'Minha Missão',
          headerRight: PERFIS_GESTAO_RETIROS.includes(usuario.perfil)
            ? () => (
                <Pressable onPress={() => navigation.navigate('RetirosLista')}>
                  <Text style={styles.headerBotao}>Retiros</Text>
                </Pressable>
              )
            : undefined,
        })}
      >
        {() => <ListaContatosScreen comunidadeId={comunidadeId} missionarioId={missionarioId} />}
      </MissaoStack.Screen>
      <MissaoStack.Screen name="CadastroContato" options={{ title: 'Nova pessoa' }}>
        {() => <CadastroContatoScreen comunidadeId={comunidadeId} missionarioId={missionarioId} />}
      </MissaoStack.Screen>
      <MissaoStack.Screen
        name="ConfirmacaoContato"
        component={ConfirmacaoContatoScreen}
        options={{ title: 'Confirmação', headerBackVisible: false }}
      />
      <MissaoStack.Screen
        name="PerfilContato"
        component={PerfilContatoScreen}
        options={{ title: 'Perfil do contato' }}
      />
      <MissaoStack.Screen name="RetirosLista" options={{ title: 'Retiros' }}>
        {() => <RetirosListScreen comunidadeId={comunidadeId} />}
      </MissaoStack.Screen>
      <MissaoStack.Screen name="NovoRetiro" options={{ title: 'Novo retiro' }}>
        {() => <NovoRetiroScreen comunidadeId={comunidadeId} />}
      </MissaoStack.Screen>
      <MissaoStack.Screen
        name="RetiroDetalhe"
        component={RetiroDetalheScreen}
        options={({ route }) => ({ title: (route.params as any)?.nome ?? 'Retiro' })}
      />
    </MissaoStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Aba Dashboard (com Funil acessível via stack interno)
// ---------------------------------------------------------------------------
const DashboardStack = createNativeStackNavigator();

function DashboardStackNavigator({ usuario }: { usuario: Usuario }) {
  const comunidadeId = usuario.comunidade_id as string;
  return (
    <DashboardStack.Navigator screenOptions={stackScreenOptions}>
      <DashboardStack.Screen name="Dashboard" options={{ title: 'Dashboard' }}>
        {() => <DashboardScreen comunidadeId={comunidadeId} usuarioId={usuario.id} perfil={usuario.perfil} />}
      </DashboardStack.Screen>
      <DashboardStack.Screen name="Funil" options={{ title: 'Funil' }}>
        {() => <FunilScreen comunidadeId={comunidadeId} />}
      </DashboardStack.Screen>
      <DashboardStack.Screen name="Ministerios" options={{ title: 'Ministérios' }}>
        {() => <MinisteriosScreen usuarioId={usuario.id} />}
      </DashboardStack.Screen>
      <DashboardStack.Screen
        name="MinisterioDetalhe"
        component={MinisterioDetalheScreen}
        options={({ route }) => ({ title: (route.params as any)?.nome ?? 'Ministério' })}
      />
      <DashboardStack.Screen name="Pastoral" options={{ title: 'Pastoral' }}>
        {() => <PastoralScreen comunidadeId={comunidadeId} usuarioId={usuario.id} />}
      </DashboardStack.Screen>
      <DashboardStack.Screen
        name="OvelhaDetalhe"
        component={OvelhaDetalheScreen}
        options={({ route }) => ({ title: (route.params as any)?.nome ?? 'Ovelha' })}
      />
    </DashboardStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Aba Pessoas (cadastro central)
// ---------------------------------------------------------------------------
const PessoasStack = createNativeStackNavigator();

function PessoasStackNavigator({ usuario }: { usuario: Usuario }) {
  const comunidadeId = usuario.comunidade_id as string;
  return (
    <PessoasStack.Navigator screenOptions={stackScreenOptions}>
      <PessoasStack.Screen name="Pessoas" options={{ title: 'Pessoas' }}>
        {() => <PessoasScreen comunidadeId={comunidadeId} usuarioId={usuario.id} />}
      </PessoasStack.Screen>
      <PessoasStack.Screen
        name="PessoaPerfil"
        component={PessoaPerfilScreen}
        options={({ route }) => ({ title: (route.params as any)?.nome ?? 'Pessoa' })}
      />
    </PessoasStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Aba Financeiro
// ---------------------------------------------------------------------------
const FinanceiroStack = createNativeStackNavigator();

function FinanceiroStackNavigator({ comunidadeId }: { comunidadeId: string }) {
  return (
    <FinanceiroStack.Navigator screenOptions={stackScreenOptions}>
      <FinanceiroStack.Screen name="Financeiro" options={{ title: 'Financeiro' }}>
        {() => <FinanceiroScreen comunidadeId={comunidadeId} />}
      </FinanceiroStack.Screen>
    </FinanceiroStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Aba Mensagens
// ---------------------------------------------------------------------------
const MensagensStack = createNativeStackNavigator();

function MensagensStackNavigator({ usuario }: { usuario: Usuario }) {
  return (
    <MensagensStack.Navigator screenOptions={stackScreenOptions}>
      <MensagensStack.Screen name="Mensagens" options={{ title: 'Mensagens' }}>
        {() => (
          <MensagensScreen comunidadeId={usuario.comunidade_id as string} usuarioId={usuario.id} />
        )}
      </MensagensStack.Screen>
    </MensagensStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Aba Perfil (com Alterar senha via stack interno)
// ---------------------------------------------------------------------------
const PerfilStack = createNativeStackNavigator();

function PerfilStackNavigator({ usuario, onSair }: { usuario: Usuario; onSair: () => Promise<void> }) {
  return (
    <PerfilStack.Navigator screenOptions={stackScreenOptions}>
      <PerfilStack.Screen name="Perfil" options={{ title: 'Perfil' }}>
        {() => <PerfilScreen usuario={usuario} onSair={onSair} />}
      </PerfilStack.Screen>
      <PerfilStack.Screen name="AlterarSenha" options={{ title: 'Alterar senha' }}>
        {() => <AlterarSenhaScreen />}
      </PerfilStack.Screen>
    </PerfilStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Tab Navigator raiz (após login)
// ---------------------------------------------------------------------------
const Tab = createBottomTabNavigator();

function iconePara(Icone: LucideIcon) {
  return ({ color, size }: { color: string; size: number }) => <Icone color={color} size={size} />;
}

function TabsAutenticado({
  usuario,
  onSair,
  lembretesHoje,
}: {
  usuario: Usuario;
  onSair: () => Promise<void>;
  lembretesHoje: number;
}) {
  const comunidadeId = usuario.comunidade_id as string;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.stone,
        tabBarStyle: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="MissaoTab"
        options={{
          title: 'Missão',
          tabBarIcon: iconePara(Target),
          tabBarBadge: lembretesHoje > 0 ? lembretesHoje : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
        }}
      >
        {() => <MissaoStackNavigator usuario={usuario} />}
      </Tab.Screen>
      <Tab.Screen name="DashboardTab" options={{ title: 'Dashboard', tabBarIcon: iconePara(LayoutDashboard) }}>
        {() => <DashboardStackNavigator usuario={usuario} />}
      </Tab.Screen>
      <Tab.Screen name="PessoasTab" options={{ title: 'Pessoas', tabBarIcon: iconePara(IdCard) }}>
        {() => <PessoasStackNavigator usuario={usuario} />}
      </Tab.Screen>
      <Tab.Screen name="FinanceiroTab" options={{ title: 'Financeiro', tabBarIcon: iconePara(Wallet) }}>
        {() => <FinanceiroStackNavigator comunidadeId={comunidadeId} />}
      </Tab.Screen>
      <Tab.Screen name="MensagensTab" options={{ title: 'Mensagens', tabBarIcon: iconePara(MessageCircle) }}>
        {() => <MensagensStackNavigator usuario={usuario} />}
      </Tab.Screen>
      <Tab.Screen name="PerfilTab" options={{ title: 'Perfil', tabBarIcon: iconePara(User) }}>
        {() => <PerfilStackNavigator usuario={usuario} onSair={onSair} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { session, usuario, carregando, entrar, sair } = useAuth();
  const [lembretesHoje, setLembretesHoje] = useState(0);

  useEffect(() => {
    if (usuario?.id) {
      contarLembretesHoje(usuario.id).then(setLembretesHoje);
    }
  }, [usuario?.id]);

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onEntrar={entrar} />;
  }

  if (!usuario || !usuario.comunidade_id) {
    return (
      <View style={styles.centro}>
        <Text style={styles.mensagem}>
          Seu usuário ainda não está vinculado a nenhuma comunidade. Fale com o coordenador da sua
          missão.
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <TabsAutenticado usuario={usuario} onSair={sair} lembretesHoje={lembretesHoje} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mensagem: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
  headerBotao: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    marginRight: 4,
  },
});
