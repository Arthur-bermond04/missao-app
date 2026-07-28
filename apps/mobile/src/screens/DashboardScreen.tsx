import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Users, UserPlus, Tent, Wallet, ArrowRight, HandHeart, Heart, ChevronRight, Users2, Calendar, Gauge, Bell } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { MetricCard } from '../components/ui/MetricCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { carregarDashboard, type DadosDashboard } from '../lib/dashboard';
import { listarParaFazer, type ItemParaFazer, type PrioridadeParaFazer } from '../lib/paraFazer';
import type { Perfil } from '../types/database';

// Perfis que acompanham ovelhas (não existe perfil "pastor" no schema — usamos liderança)
const PERFIS_PASTORAL: Perfil[] = ['lider', 'coordenador', 'padre', 'admin'];

const COR_PRIORIDADE: Record<PrioridadeParaFazer, string> = {
  urgente: colors.dangerText,
  hoje: colors.amber,
  semana: colors.accent,
};

const LABEL_PRIORIDADE: Record<PrioridadeParaFazer, string> = {
  urgente: 'URGENTE',
  hoje: 'HOJE',
  semana: 'ESTA SEMANA',
};

export function DashboardScreen({
  comunidadeId,
  usuarioId,
  perfil,
}: {
  comunidadeId: string;
  usuarioId: string;
  perfil: Perfil;
}) {
  const navigation = useNavigation<any>();
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [paraFazer, setParaFazer] = useState<ItemParaFazer[]>([]);
  const [carregando, setCarregando] = useState(true);
  const podePastoral = PERFIS_PASTORAL.includes(perfil);
  const podeGestao = perfil === 'coordenador' || perfil === 'admin';

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      carregarDashboard(comunidadeId)
        .then(setDados)
        .finally(() => setCarregando(false));
      listarParaFazer(comunidadeId, usuarioId).then(setParaFazer).catch(() => setParaFazer([]));
    }, [comunidadeId, usuarioId])
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={carregando}
          onRefresh={() => {
            setCarregando(true);
            carregarDashboard(comunidadeId).then(setDados).finally(() => setCarregando(false));
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.titulo}>Dashboard</Text>
      <Text style={styles.subtitulo}>Visão geral da comunidade</Text>

      {/* Para fazer hoje — a primeira coisa que o usuário vê */}
      {paraFazer.length > 0 && (
        <View style={styles.paraFazerCard}>
          <Text style={styles.secaoTitulo}>Para fazer hoje</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {paraFazer.slice(0, 6).map((item) => (
              <Pressable
                key={item.chave}
                style={styles.paraFazerItem}
                onPress={() =>
                  item.tipo === 'ovelha'
                    ? navigation.navigate('Pastoral')
                    : navigation.navigate('PessoasTab', { screen: 'PessoaPerfil', params: { pessoaId: item.id, nome: item.nome, usuarioId } })
                }
              >
                <View style={[styles.prioridadeDot, { backgroundColor: COR_PRIORIDADE[item.prioridade] }]} />
                <View style={styles.avatarPeq}>
                  <Text style={styles.avatarPeqTexto}>{item.nome.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paraFazerNome}>{item.nome}</Text>
                  <Text style={styles.paraFazerDesc}>
                    {LABEL_PRIORIDADE[item.prioridade]} · {item.descricao}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.grid}>
        <MetricCard
          style={styles.gridItem}
          icon={Users}
          iconColor={colors.goldDark}
          iconBg={colors.goldBg}
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
          iconColor={colors.goldDark}
          iconBg={colors.goldBg}
          label="Próximo retiro"
          value={d.proximoRetiro?.nome ?? 'Nenhum'}
          subtitle={
            d.proximoRetiro ? new Date(d.proximoRetiro.data_inicio).toLocaleDateString('pt-BR') : undefined
          }
        />
        <MetricCard
          style={styles.gridItem}
          icon={Wallet}
          iconColor={colors.goldDark}
          iconBg={colors.goldBg}
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

      {/* Acesso a Ministérios e Pastoral */}
      <Pressable style={styles.acessoCard} onPress={() => navigation.navigate('Ministerios')}>
        <View style={[styles.acessoIcone, { backgroundColor: colors.primaryLight }]}>
          <HandHeart size={18} color={colors.primary} />
        </View>
        <Text style={styles.acessoLabel}>Meus ministérios</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      {podePastoral && (
        <Pressable style={styles.acessoCard} onPress={() => navigation.navigate('Pastoral')}>
          <View style={[styles.acessoIcone, { backgroundColor: colors.primaryLight }]}>
            <Heart size={18} color={colors.primary} />
          </View>
          <Text style={styles.acessoLabel}>Acompanhamento pastoral</Text>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      )}

      <Pressable style={styles.acessoCard} onPress={() => navigation.navigate('Celulas')}>
        <View style={[styles.acessoIcone, { backgroundColor: colors.primaryLight }]}>
          <Users2 size={18} color={colors.primary} />
        </View>
        <Text style={styles.acessoLabel}>Células</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.acessoCard} onPress={() => navigation.navigate('Agenda')}>
        <View style={[styles.acessoIcone, { backgroundColor: colors.primaryLight }]}>
          <Calendar size={18} color={colors.primary} />
        </View>
        <Text style={styles.acessoLabel}>Agenda</Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      {podeGestao && (
        <>
          <Pressable style={styles.acessoCard} onPress={() => navigation.navigate('Monitoria')}>
            <View style={[styles.acessoIcone, { backgroundColor: colors.primaryLight }]}>
              <Gauge size={18} color={colors.primary} />
            </View>
            <Text style={styles.acessoLabel}>Monitoria pastoral</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable style={styles.acessoCard} onPress={() => navigation.navigate('Alertas')}>
            <View style={[styles.acessoIcone, { backgroundColor: colors.primaryLight }]}>
              <Bell size={18} color={colors.primary} />
            </View>
            <Text style={styles.acessoLabel}>Alertas</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
        </>
      )}
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
  acessoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  acessoIcone: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  acessoLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  funilLista: { marginTop: 12, gap: 12 },
  funilItem: { gap: 6 },
  funilLinha: { flexDirection: 'row', justifyContent: 'space-between' },
  funilLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  funilNumero: { fontSize: 14, color: colors.textMuted },
  verFunil: { marginTop: 16 },
  paraFazerCard: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paraFazerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  prioridadeDot: { width: 8, height: 8, borderRadius: 4 },
  avatarPeq: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarPeqTexto: { fontSize: 11, fontWeight: '700', color: colors.primary },
  paraFazerNome: { fontSize: 14, fontWeight: '600', color: colors.text },
  paraFazerDesc: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
