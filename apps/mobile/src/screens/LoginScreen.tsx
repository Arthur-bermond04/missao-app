import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

export function LoginScreen({
  onEntrar,
}: {
  onEntrar: (email: string, senha: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function handleEntrar() {
    if (!email.trim() || !senha) {
      Alert.alert('Atenção', 'Informe e-mail e senha.');
      return;
    }
    setEntrando(true);
    try {
      await onEntrar(email.trim(), senha);
    } catch (e: any) {
      Alert.alert('Não foi possível entrar', e.message ?? 'Verifique suas credenciais.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>MissãoApp</Text>
      <Text style={styles.subtitulo}>Entre para continuar sua missão</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <Pressable
        style={[styles.botao, entrando && styles.botaoDesabilitado]}
        onPress={handleEntrar}
        disabled={entrando}
      >
        <Text style={styles.botaoTexto}>{entrando ? 'Entrando...' : 'Entrar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 28, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  subtitulo: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 12,
  },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
