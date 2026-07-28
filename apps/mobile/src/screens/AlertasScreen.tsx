import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { EmptyState } from '../components/ui/EmptyState';
import { gerarAlertas, type AlertaCentral, type NivelAlerta } from '../lib/alertas';
import type { Usuario } from '../types/database';

const NIVEL_COR: Record<NivelAlerta, string> = {
  urgente: colors.dangerText,
  atencao: colors.amber,
  informativo: colors.accent,
};
const NIVEL_LABEL: Record<NivelAlerta, string> = {
  urgente: 'URGENTE',
  atencao: 'ATENÇÃO',
  informativo: 'INFORMATIVO',
};

export function AlertasScreen({ usuario }: { usuario: Usuario }) {
  const [alertas, setAlertas] = useState<AlertaCentral[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    if (!usuario.comunidade_id) return;
    setCarregando(true);
    gerarAlertas(usuario.comunidade_id, usuario)
      .then(setAlertas)
      .catch(() => setAlertas([]))
      .finally(() => setCarregando(false));
  }, [usuario]);

  useFocusEffect(useCallback(() => carregar(), [carregar]));

  const secoes = useMemo(() => {
    const grupos: Record<NivelAlerta, AlertaCentral[]> = { urgente: [], atencao: [], informativo: [] };
    for (const a of alertas) grupos[a.nivel].push(a);
    return (['urgente', 'atencao', 'informativo'] as NivelAlerta[])
      .filter((n) => grupos[n].length > 0)
      .map((n) => ({ nivel: n, data: grupos[n] }));
  }, [alertas]);

  if (!carregando && alertas.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState icon={Check} title="Nenhum alerta" description="Tudo em dia — nada precisa de atenção agora. 🎉" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={secoes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.secaoTitulo, { color: NIVEL_COR[section.nivel] }]}>
            {NIVEL_LABEL[section.nivel]} ({section.data.length})
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: NIVEL_COR[item.nivel] }]}>
            <View style={styles.cardTopo}>
              <Text style={styles.mensagem}>{item.mensagem}</Text>
              <View style={styles.moduloPill}>
                <Text style={styles.moduloTexto}>{item.modulo}</Text>
              </View>
            </View>
            {!!item.detalhe && <Text style={styles.detalhe}>{item.detalhe}</Text>}
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Bell size={16} color={colors.primary} />
            <Text style={styles.headerTexto}>Tudo que precisa de atenção, em ordem de urgência.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerTexto: { fontSize: 13, color: colors.textMuted, flex: 1 },
  secaoTitulo: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 14, marginBottom: 6, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, padding: 12, marginBottom: 8 },
  cardTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mensagem: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  moduloPill: { backgroundColor: colors.background, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  moduloTexto: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  detalhe: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
