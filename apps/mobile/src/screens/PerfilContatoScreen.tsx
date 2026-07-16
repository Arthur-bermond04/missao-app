import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { BadgeInteresse } from '../components/BadgeInteresse';
import { Avatar } from '../components/Avatar';
import { listarContatosLocais, atualizarEtapaJornadaLocal } from '../lib/localDb';
import { sincronizarContatos } from '../lib/sync';
import type { Contato, EtapaJornada } from '../types/database';

const ETAPAS: { valor: EtapaJornada; label: string }[] = [
  { valor: 'abordagem', label: 'Abordagem' },
  { valor: 'celula', label: 'Célula' },
  { valor: 'retiro', label: 'Retiro' },
  { valor: 'cv', label: 'CV' },
  { valor: 'cal', label: 'CAL' },
];

export function PerfilContatoScreen() {
  const { params } = useRoute<any>();
  const { contatoId } = params as { contatoId: string };
  const [contato, setContato] = useState<Contato | null>(null);

  async function carregar() {
    const lista = await listarContatosLocais();
    setContato(lista.find((c) => c.id === contatoId) ?? null);
  }

  useEffect(() => {
    carregar();
  }, [contatoId]);

  async function avancarEtapa() {
    if (!contato) return;
    const indiceAtual = ETAPAS.findIndex((e) => e.valor === contato.etapa_jornada);
    const proxima = ETAPAS[indiceAtual + 1];
    if (!proxima) {
      Alert.alert('Jornada completa', 'Essa pessoa já concluiu todas as etapas registradas.');
      return;
    }
    await atualizarEtapaJornadaLocal(contato.id, proxima.valor);
    await carregar();
    sincronizarContatos();
  }

  if (!contato) {
    return (
      <View style={styles.container}>
        <Text style={styles.vazio}>Contato não encontrado.</Text>
      </View>
    );
  }

  const indiceEtapaAtual = ETAPAS.findIndex((e) => e.valor === contato.etapa_jornada);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <View style={styles.cabecalho}>
        <Avatar nome={contato.nome} size={64} />
        <Text style={styles.nome}>{contato.nome}</Text>
        <BadgeInteresse nivel={contato.nivel_interesse} />
      </View>

      <View style={styles.card}>
        <InfoLinha label="Telefone" valor={contato.telefone ?? '-'} />
        <InfoLinha label="Idade" valor={contato.idade ? String(contato.idade) : '-'} />
        <InfoLinha label="Local da abordagem" valor={contato.local_abordagem ?? '-'} />
        <InfoLinha
          label="Data da abordagem"
          valor={new Date(contato.data_abordagem).toLocaleString('pt-BR')}
        />
        {contato.tags.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Tags</Text>
            <View style={styles.tagsRow}>
              {contato.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagTexto}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {!!contato.observacoes && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Observações</Text>
            <Text style={styles.valor}>{contato.observacoes}</Text>
          </View>
        )}
      </View>

      <Text style={styles.secaoTitulo}>Jornada</Text>
      <View style={styles.timeline}>
        {ETAPAS.map((etapa, index) => {
          const concluida = index <= indiceEtapaAtual;
          return (
            <View key={etapa.valor} style={styles.timelineItem}>
              <View style={[styles.timelineBolinha, concluida && styles.timelineBolinhaAtiva]} />
              <Text style={[styles.timelineLabel, concluida && styles.timelineLabelAtivo]}>
                {etapa.label}
              </Text>
              {index < ETAPAS.length - 1 && (
                <View style={[styles.timelineLinha, concluida && styles.timelineLinhaAtiva]} />
              )}
            </View>
          );
        })}
      </View>

      <Pressable style={styles.botaoAvancar} onPress={avancarEtapa}>
        <Text style={styles.botaoAvancarTexto}>Atualizar etapa da jornada</Text>
      </Pressable>

      <Pressable
        style={styles.botaoIntegrado}
        onPress={() =>
          Alert.alert('Integrado à comunidade', `${contato.nome} foi marcado(a) como integrado(a). 🎉`)
        }
      >
        <Text style={styles.botaoIntegradoTexto}>Marcar como integrado à comunidade</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.infoLinha}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20, paddingBottom: 60 },
  vazio: { textAlign: 'center', color: colors.textMuted, marginTop: 60 },
  cabecalho: { alignItems: 'center', gap: 8, marginBottom: 20 },
  nome: { fontSize: 20, fontWeight: '800', color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  infoLinha: { gap: 2 },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  valor: { fontSize: 14, color: colors.text },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  tagTexto: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 12 },
  timeline: { flexDirection: 'row', alignItems: 'center' },
  timelineItem: { flex: 1, alignItems: 'center' },
  timelineBolinha: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  timelineBolinhaAtiva: { backgroundColor: colors.primary },
  timelineLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  timelineLabelAtivo: { color: colors.primary, fontWeight: '700' },
  timelineLinha: {
    position: 'absolute',
    top: 7,
    left: '60%',
    right: '-60%',
    height: 2,
    backgroundColor: colors.border,
  },
  timelineLinhaAtiva: { backgroundColor: colors.primary },
  botaoAvancar: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  botaoAvancarTexto: { color: '#fff', fontWeight: '700' },
  botaoIntegrado: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.success,
  },
  botaoIntegradoTexto: { color: colors.success, fontWeight: '700' },
});
