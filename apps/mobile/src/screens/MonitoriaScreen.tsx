import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Gauge, Lock, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase } from '../lib/supabase';
import {
  agruparMetricasPorPastor,
  listarOvelhasResumo,
  ovelhaEmAtraso,
  statusPastor,
  type MetricasPastor,
  type OvelhaResumo,
  type StatusPastor,
} from '../lib/monitoria';
import { toastErro } from '../lib/toast';
import type { Perfil } from '../types/database';

const PERFIS_GESTAO: Perfil[] = ['coordenador', 'admin'];

const STATUS_COR: Record<StatusPastor, string> = {
  ativo: colors.accent,
  atencao: colors.amber,
  inativo: colors.dangerText,
};
const STATUS_LABEL: Record<StatusPastor, string> = {
  ativo: 'Ativo',
  atencao: 'Atenção',
  inativo: 'Inativo',
};
const ESTADO_COR: Record<string, string> = {
  crescendo: colors.accent,
  estavel: colors.primary,
  atencao: colors.amber,
  risco: colors.dangerText,
};

export function MonitoriaScreen({ comunidadeId, perfil }: { comunidadeId: string; perfil: Perfil }) {
  const podeAcessar = PERFIS_GESTAO.includes(perfil);
  const [ovelhas, setOvelhas] = useState<OvelhaResumo[]>([]);
  const [pastores, setPastores] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [detalhe, setDetalhe] = useState<MetricasPastor | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    Promise.all([
      listarOvelhasResumo(comunidadeId),
      supabase.from('usuarios').select('id, nome').eq('comunidade_id', comunidadeId).order('nome', { ascending: true }),
    ])
      .then(([resumo, { data }]) => {
        setOvelhas(resumo);
        setPastores((data as { id: string; nome: string }[]) ?? []);
      })
      .catch((e) => toastErro(e?.message ?? 'Erro ao carregar métricas.'))
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  useFocusEffect(useCallback(() => {
    if (podeAcessar) carregar();
    else setCarregando(false);
  }, [podeAcessar, carregar]));

  const metricas = useMemo(() => agruparMetricasPorPastor(ovelhas, pastores), [ovelhas, pastores]);
  const resumoGeral = useMemo(() => ({
    total: metricas.length,
    ativas: ovelhas.length,
    emAtraso: ovelhas.filter(ovelhaEmAtraso).length,
    emRisco: ovelhas.filter((o) => o.estado_espiritual === 'risco').length,
  }), [metricas, ovelhas]);

  if (!podeAcessar) {
    return (
      <View style={styles.container}>
        <EmptyState icon={Lock} title="Acesso restrito" description="A monitoria pastoral é visível apenas para coordenadores e administradores." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {detalhe && <PainelPastor metricas={detalhe} onFechar={() => setDetalhe(null)} />}

      <FlatList
        data={metricas}
        keyExtractor={(m) => m.pastorId}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListHeaderComponent={
          <View>
            <View style={styles.aviso}>
              <Lock size={13} color={colors.primary} />
              <Text style={styles.avisoTexto}>Você vê métricas — os relatos são confidenciais e visíveis só pelo pastor.</Text>
            </View>
            <View style={styles.cardsResumo}>
              <ResumoCard label="Pastores" valor={resumoGeral.total} />
              <ResumoCard label="Ovelhas" valor={resumoGeral.ativas} />
              <ResumoCard label="Em atraso" valor={resumoGeral.emAtraso} cor={resumoGeral.emAtraso > 0 ? colors.amber : undefined} />
              <ResumoCard label="Em risco" valor={resumoGeral.emRisco} cor={resumoGeral.emRisco > 0 ? colors.dangerText : undefined} />
            </View>
          </View>
        }
        ListEmptyComponent={
          !carregando ? (
            <EmptyState icon={Gauge} title="Nenhum pastor com acompanhamento" description="Ninguém tem ovelhas ativas ainda." />
          ) : null
        }
        renderItem={({ item: m }) => {
          const status = statusPastor(m.taxaCumprimento);
          return (
            <Pressable style={styles.pastorCard} onPress={() => setDetalhe(m)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pastorNome}>{m.pastorNome}</Text>
                <Text style={styles.pastorMeta}>
                  {m.ovelhasAtivas} ovelha(s) · {m.encontrosMes} enc./mês
                  {m.emAtraso > 0 ? ` · ${m.emAtraso} em atraso` : ''}
                  {m.emRisco > 0 ? ` · ${m.emRisco} em risco` : ''}
                </Text>
              </View>
              <Text style={[styles.taxa, { color: STATUS_COR[status] }]}>{m.taxaCumprimento}%</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function ResumoCard({ label, valor, cor }: { label: string; valor: number; cor?: string }) {
  return (
    <View style={styles.resumoCard}>
      <Text style={[styles.resumoValor, cor ? { color: cor } : null]}>{valor}</Text>
      <Text style={styles.resumoLabel}>{label}</Text>
    </View>
  );
}

function PainelPastor({ metricas, onFechar }: { metricas: MetricasPastor; onFechar: () => void }) {
  const status = statusPastor(metricas.taxaCumprimento);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.painel}>
          <View style={styles.painelTopo}>
            <View>
              <Text style={styles.modalTitulo}>{metricas.pastorNome}</Text>
              <Text style={[styles.pastorMeta, { color: STATUS_COR[status] }]}>{STATUS_LABEL[status]} · {metricas.taxaCumprimento}%</Text>
            </View>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: '80%' }} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.secao}>
              Encontros: {metricas.encontrosMes} de {metricas.ovelhasAtivas} · {metricas.emAtraso} em atraso
            </Text>
            <Text style={styles.campoLabel}>Suas ovelhas</Text>
            {metricas.ovelhas.map((o) => {
              const atraso = ovelhaEmAtraso(o);
              return (
                <View key={o.id} style={styles.ovelhaLinha}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.estadoDot, { backgroundColor: ESTADO_COR[o.estado_espiritual] ?? colors.textMuted }]} />
                      <Text style={styles.pastorNome}>{o.nome}</Text>
                    </View>
                    <Text style={styles.pastorMeta}>
                      Último: {o.ultimo_encontro ? new Date(o.ultimo_encontro).toLocaleDateString('pt-BR') : 'nenhum'}
                      {atraso ? ' · em atraso' : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
            <View style={styles.aviso}>
              <Lock size={12} color={colors.primary} />
              <Text style={styles.avisoTexto}>Os relatos de cada encontro são confidenciais e visíveis só pelo pastor.</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: 16, gap: 10, paddingBottom: 40 },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginBottom: 12, marginTop: 12 },
  avisoTexto: { flex: 1, fontSize: 12, color: colors.primary },
  cardsResumo: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  resumoCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  resumoValor: { fontSize: 20, fontWeight: '800', color: colors.text },
  resumoLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  pastorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  pastorNome: { fontSize: 14, fontWeight: '700', color: colors.text },
  pastorMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  taxa: { fontSize: 18, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  painel: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  painelTopo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  secao: { fontSize: 13, color: colors.text, backgroundColor: colors.background, borderRadius: 10, padding: 10 },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 14, marginBottom: 6 },
  ovelhaLinha: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginTop: 6 },
  estadoDot: { width: 8, height: 8, borderRadius: 4 },
});
