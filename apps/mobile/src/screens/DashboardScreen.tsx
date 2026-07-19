import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Users, UserPlus, Tent, Wallet, ArrowRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { MetricCard } from '../components/ui/MetricCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { carregarDashboard, type DadosDashboard } from '../lib/dashboard';

export function DashboardScreen({ comunidadeId }: { comunidadeId: string }) {
  const navigation = useNavigation<any>();
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      carregarDashboard(comunidadeId)
        .then(setDados)
        .finally(() => setCarregando(false));
    }, [comunidadeId])
  );

  if (carregando && !dados) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const d = dados!;
  const maiorFunil = d.funil[0]?.total || 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Dashboard</Text>
      <Text style={styles.subtitulo}>Visão geral da comunidade</Text>

      <View style={styles.grid}>
        <MetricCard
          style={styles.gridItem}
          icon={Users}
          iconColor={colors.primary}
          iconBg={colors.primaryLight}
          label="Membros ativos"
          value={d.membrosAtivos}
        />
        <MetricCard
          style={styles.gridItem}
          icon={UserPlus}
          iconColor={colors.info}
          iconBg={colors.infoLight}
          label="Contatos cadastrados"
          value={d.totalContatos}
        />
        <MetricCard
          style={styles.gridItem}
          icon={Tent}
          iconColor={colors.amber}
          iconBg={colors.amberLight}
          label="Próximo retiro"
          value={d.proximoRetiro?.nome ?? 'Nenhum'}
          subtitle={
            d.proximoRetiro ? new Date(d.proximoRetiro.data_inicio).toLocaleDateString('pt-BR') : undefined
          }
        />
        <MetricCard
          style={styles.gridItem}
          icon={Wallet}
          iconColor={colors.accent}
          iconBg={colors.accentLight}
          label="Arrecadação do mês"
          value={`R$ ${d.arrecadacaoMes.toFixed(2)}`}
        />
      </View>

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Funil do mês</Text>
        {d.totalContatos === 0 ? (
          <Text style={styles.vazio}>Ainda não há contatos cadastrados.</Text>
        ) : (
          <View style={styles.funilLista}>
            {d.funil.map((etapa) => (
              <View key={etapa.valor} style={styles.funilItem}>
                <View style={styles.funilLinha}>
                  <Text style={styles.funilLabel}>{etapa.label}</Text>
                  <Text style={styles.funilNumero}>{etapa.total}</Text>
                </View>
                <ProgressBar percentual={(etapa.total / maiorFunil) * 100} />
              </View>
            ))}
          </View>
        )}

        <Button
          label="Ver funil completo"
          variant="secondary"
          icon={ArrowRight}
          onPress={() => navigation.navigate('Funil')}
          style={styles.verFunil}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  conteudo: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitulo: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  gridItem: { width: '47.5%', flexGrow: 1 },
  secao: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.text },
  vazio: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
  funilLista: { marginTop: 12, gap: 12 },
  funilItem: { gap: 6 },
  funilLinha: { flexDirection: 'row', justifyContent: 'space-between' },
  funilLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  funilNumero: { fontSize: 14, color: colors.textMuted },
  verFunil: { marginTop: 16 },
});
