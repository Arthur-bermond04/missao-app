import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { listarRetiros } from '../lib/retiros';
import type { Retiro } from '../types/database';

export function RetirosListScreen({ comunidadeId }: { comunidadeId: string }) {
  const navigation = useNavigation<any>();
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarRetiros(comunidadeId)
      .then(setRetiros)
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={retiros}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListEmptyComponent={
          !carregando ? (
            <Text style={styles.vazio}>Nenhum retiro cadastrado ainda.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('RetiroDetalhe', { retiroId: item.id, nome: item.nome })}
          >
            <Text style={styles.nome}>{item.nome}</Text>
            <Text style={styles.datas}>
              {new Date(item.data_inicio).toLocaleDateString('pt-BR')} a{' '}
              {new Date(item.data_fim).toLocaleDateString('pt-BR')}
            </Text>
            {!!item.local && <Text style={styles.local}>📍 {item.local}</Text>}
            <View style={[styles.badge, styles[`badge_${item.status}` as const]]}>
              <Text style={styles.badgeTexto}>{item.status}</Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('NovoRetiro')}
        accessibilityLabel="Criar novo retiro"
      >
        <Text style={styles.fabTexto}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: 20, paddingBottom: 100, gap: 10 },
  vazio: { textAlign: 'center', color: colors.textMuted, marginTop: 60 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  nome: { fontSize: 16, fontWeight: '700', color: colors.text },
  datas: { fontSize: 13, color: colors.textMuted },
  local: { fontSize: 12, color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  badge_aberto: { backgroundColor: colors.successLight },
  badge_encerrado: { backgroundColor: colors.warningLight },
  badge_realizado: { backgroundColor: colors.primaryLight },
  badgeTexto: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'capitalize' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: 'rgba(34,197,94,0.4)',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabTexto: { color: '#FFFFFF', fontSize: 28, lineHeight: 30, fontWeight: '400' },
});
