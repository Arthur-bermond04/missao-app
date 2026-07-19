import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { HandHeart, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { EmptyState } from '../components/ui/EmptyState';
import { listarMeusMinisterios, type MeuMinisterio } from '../lib/ministerios';

const CARGO_LABEL: Record<string, string> = {
  coordenador: 'Coordenador',
  'vice-coordenador': 'Vice',
  membro: 'Membro',
};

export function MinisteriosScreen({ usuarioId }: { usuarioId: string }) {
  const navigation = useNavigation<any>();
  const [ministerios, setMinisterios] = useState<MeuMinisterio[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarMeusMinisterios(usuarioId)
      .then(setMinisterios)
      .finally(() => setCarregando(false));
  }, [usuarioId]);

  useFocusEffect(useCallback(() => carregar(), [carregar]));

  return (
    <View style={styles.container}>
      <FlatList
        data={ministerios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListEmptyComponent={
          !carregando ? (
            <EmptyState
              icon={HandHeart}
              title="Você ainda não está em nenhum ministério"
              description="Quando um coordenador te adicionar a um ministério, ele aparece aqui."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('MinisterioDetalhe', {
                ministerioId: item.id,
                nome: item.nome,
                cargo: item.cargo,
                comunidadeId: item.comunidade_id,
              })
            }
          >
            <View style={[styles.corDot, { backgroundColor: item.cor }]} />
            <View style={styles.info}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.meta}>
                {CARGO_LABEL[item.cargo] ?? item.cargo}
                {item.proximo_encontro
                  ? ` · próximo: ${new Date(item.proximo_encontro).toLocaleDateString('pt-BR')}`
                  : ''}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: 20, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  corDot: { width: 14, height: 14, borderRadius: 7 },
  info: { flex: 1 },
  nome: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
