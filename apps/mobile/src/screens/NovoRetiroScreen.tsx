import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { criarRetiro } from '../lib/retiros';

export function NovoRetiroScreen({ comunidadeId }: { comunidadeId: string }) {
  const navigation = useNavigation<any>();
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [local, setLocal] = useState('');
  const [vagas, setVagas] = useState('');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim() || !dataInicio || !dataFim) {
      Alert.alert('Atenção', 'Informe nome, data de início e data de fim (AAAA-MM-DD).');
      return;
    }
    setSalvando(true);
    try {
      await criarRetiro({
        comunidade_id: comunidadeId,
        nome: nome.trim(),
        data_inicio: dataInicio,
        data_fim: dataFim,
        local: local.trim() || undefined,
        vagas: vagas ? Number(vagas) : undefined,
        valor: valor ? Number(valor) : undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message ?? 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Novo retiro</Text>

      <Text style={styles.label}>Nome *</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Retiro de Emaús" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Data de início * (AAAA-MM-DD)</Text>
      <TextInput style={styles.input} value={dataInicio} onChangeText={setDataInicio} placeholder="2026-08-15" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Data de fim * (AAAA-MM-DD)</Text>
      <TextInput style={styles.input} value={dataFim} onChangeText={setDataFim} placeholder="2026-08-17" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Local</Text>
      <TextInput style={styles.input} value={local} onChangeText={setLocal} placeholder="Sítio da comunidade" placeholderTextColor={colors.textMuted} />

      <View style={styles.linha}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Vagas</Text>
          <TextInput style={styles.input} value={vagas} onChangeText={setVagas} keyboardType="number-pad" placeholder="50" placeholderTextColor={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput style={styles.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="150.00" placeholderTextColor={colors.textMuted} />
        </View>
      </View>

      <Pressable style={[styles.botao, salvando && styles.botaoDesabilitado]} onPress={salvar} disabled={salvando}>
        <Text style={styles.botaoTexto}>{salvando ? 'Salvando...' : 'Criar retiro'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20, paddingBottom: 60 },
  titulo: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 14, marginBottom: 6 },
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
  linha: { flexDirection: 'row', gap: 12 },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
