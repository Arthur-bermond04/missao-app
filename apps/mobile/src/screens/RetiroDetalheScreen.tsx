import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { listarInscritos, marcarPresenca } from '../lib/retiros';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import type { InscricaoRetiro } from '../types/database';

export function RetiroDetalheScreen() {
  const { params } = useRoute<any>();
  const { retiroId } = params as { retiroId: string; nome: string };
  const [inscritos, setInscritos] = useState<InscricaoRetiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(() => {
    setCarregando(true);
    listarInscritos(retiroId)
      .then(setInscritos)
      .finally(() => setCarregando(false));
  }, [retiroId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const filtrados = useMemo(() => {
    if (!busca) return inscritos;
    return inscritos.filter((i) => (i.nome ?? '').toLowerCase().includes(busca.toLowerCase()));
  }, [inscritos, busca]);

  async function alternarPresenca(inscricao: InscricaoRetiro) {
    const novoValor = !inscricao.presente;
    setInscritos((atual) =>
      atual.map((i) => (i.id === inscricao.id ? { ...i, presente: novoValor } : i))
    );
    try {
      await marcarPresenca(inscricao.id, novoValor);
      hapticoSucesso();
    } catch {
      hapticoErro();
      carregar();
    }
  }

  const totalPresentes = inscritos.filter((i) => i.presente).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.contador}>
          {totalPresentes} de {inscritos.length} presentes
        </Text>
      </View>

      <TextInput
        style={styles.busca}
        placeholder="Buscar por nome para check-in"
        placeholderTextColor={colors.textSecondary}
        value={busca}
        onChangeText={setBusca}
      />

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListEmptyComponent={
          !carregando ? <Text style={styles.vazio}>Nenhum inscrito encontrado.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, item.presente && styles.cardPresente]}
            onPress={() => alternarPresenca(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{item.nome ?? 'Sem nome'}</Text>
              {!!item.grupo && <Text style={styles.grupo}>Grupo: {item.grupo}</Text>}
            </View>
            <Text style={styles.pagou}>{item.pagou ? '💰 Pago' : '⏳ Pendente'}</Text>
            <View style={[styles.checkbox, item.presente && styles.checkboxAtivo]}>
              {item.presente && <Text style={styles.checkboxTexto}>✓</Text>}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  contador: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  busca: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  lista: { padding: 20, paddingBottom: 60, gap: 8 },
  vazio: { textAlign: 'center', color: colors.textSecondary, marginTop: 60 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardPresente: { borderColor: colors.success },
  nome: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  grupo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pagou: { fontSize: 11, color: colors.textSecondary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxAtivo: { backgroundColor: colors.success, borderColor: colors.success },
  checkboxTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
