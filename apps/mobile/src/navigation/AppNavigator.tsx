import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ListaContatosScreen } from '../screens/ListaContatosScreen';
import { CadastroContatoScreen } from '../screens/CadastroContatoScreen';
import { ConfirmacaoContatoScreen } from '../screens/ConfirmacaoContatoScreen';
import { PerfilContatoScreen } from '../screens/PerfilContatoScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuth } from '../lib/useAuth';
import { colors } from '../theme/colors';

export type RootStackParamList = {
  ListaContatos: undefined;
  CadastroContato: undefined;
  ConfirmacaoContato: {
    contatoId: string;
    nome: string;
    telefone: string;
    localAbordagem: string;
    nivelInteresse: 'quente' | 'morno' | 'frio';
  };
  PerfilContato: { contatoId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { session, usuario, carregando, entrar } = useAuth();

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
          Seu usuário ainda não está vinculado a nenhuma comunidade. Fale com o coordenador da
          sua missão.
        </Text>
      </View>
    );
  }

  const comunidadeId = usuario.comunidade_id;
  const missionarioId = usuario.id;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="ListaContatos" options={{ title: 'Minha Missão' }}>
          {() => <ListaContatosScreen comunidadeId={comunidadeId} missionarioId={missionarioId} />}
        </Stack.Screen>
        <Stack.Screen name="CadastroContato" options={{ title: 'Nova pessoa' }}>
          {() => <CadastroContatoScreen comunidadeId={comunidadeId} missionarioId={missionarioId} />}
        </Stack.Screen>
        <Stack.Screen
          name="ConfirmacaoContato"
          component={ConfirmacaoContatoScreen}
          options={{ title: 'Confirmação', headerBackVisible: false }}
        />
        <Stack.Screen
          name="PerfilContato"
          component={PerfilContatoScreen}
          options={{ title: 'Perfil do contato' }}
        />
      </Stack.Navigator>
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
});
