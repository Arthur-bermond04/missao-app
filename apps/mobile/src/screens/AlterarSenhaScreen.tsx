import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { alterarSenha } from '../lib/usuarios';
import { toastSucesso, toastErro } from '../lib/toast';

export function AlterarSenhaScreen() {
  const navigation = useNavigation<any>();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (novaSenha.length < 6) {
      toastErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      toastErro('As senhas não coincidem.');
      return;
    }
    setSalvando(true);
    try {
      await alterarSenha(novaSenha);
      toastSucesso('Senha alterada com sucesso!');
      navigation.goBack();
    } catch (e: any) {
      toastErro(e?.message ?? 'Erro ao alterar senha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.campoLabel}>Nova senha</Text>
      <TextInput
        style={styles.input}
        value={novaSenha}
        onChangeText={setNovaSenha}
        placeholder="Mínimo 6 caracteres"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
      />

      <Text style={styles.campoLabel}>Confirmar nova senha</Text>
      <TextInput
        style={styles.input}
        value={confirmar}
        onChangeText={setConfirmar}
        placeholder="Repita a senha"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
      />

      <Button label="Salvar" onPress={handleSalvar} loading={salvando} style={styles.salvar} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20 },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
  },
  salvar: { marginTop: 24 },
});
