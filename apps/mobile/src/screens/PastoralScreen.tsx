import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Heart, Sparkles, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import {
  contarFrutosPorOvelha,
  criarOvelha,
  listarEncontrosPastorais,
  listarOvelhas,
  reuniaoAtrasada,
} from '../lib/pastoral';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import { useTerminologia } from '../lib/terminologia';
import { ESTADOS_ESPIRITUAL, type PastoralEncontro, type PastoralOvelha } from '../types/database';

function EstadoBadge({ estado }: { estado: PastoralOvelha['estado_espiritual'] }) {
  const cfg = ESTADOS_ESPIRITUAL.find((e) => e.valor === estado);
  const cor = cfg?.cor ?? colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: cor + '22' }]}>
      <Text style={[styles.badgeTexto, { color: cor }]}>{cfg?.label ?? estado}</Text>
    </View>
  );
}

export function PastoralScreen({ comunidadeId, usuarioId }: { comunidadeId: string; usuarioId: string }) {
  const navigation = useNavigation<any>();
  const terminologia = useTerminologia(comunidadeId);
  const [ovelhas, setOvelhas] = useState<PastoralOvelha[]>([]);
  const [encontros, setEncontros] = useState<PastoralEncontro[]>([]);
  const [frutosPorOvelha, setFrutosPorOvelha] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [modalNova, setModalNova] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarOvelhas(comunidadeId)
      .then(async (lista) => {
        setOvelhas(lista);
        const ids = lista.map((o) => o.id);
        if (ids.length === 0) {
          setEncontros([]);
          setFrutosPorOvelha({});
          return;
        }
        const [encontrosPorOvelha, frutos] = await Promise.all([
          Promise.all(ids.map((id) => listarEncontrosPastorais(id))),
          contarFrutosPorOvelha(ids),
        ]);
        setEncontros(encontrosPorOvelha.flat());
        setFrutosPorOvelha(frutos);
      })
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  useFocusEffect(useCallback(() => carregar(), [carregar]));

  const encontrosPorOvelha = useMemo(() => {
    const mapa = new Map<string, PastoralEncontro[]>();
    for (const e of encontros) {
      const arr = mapa.get(e.ovelha_id) ?? [];
      arr.push(e);
      mapa.set(e.ovelha_id, arr);
    }
    return mapa;
  }, [encontros]);

  return (
    <View style={styles.container}>
      <NovaOvelhaModal
        visivel={modalNova}
        onFechar={() => setModalNova(false)}
        comunidadeId={comunidadeId}
        pastorId={usuarioId}
        nomeOvelha={terminologia.nome_ovelha}
        onSalvo={carregar}
      />

      <FlatList
        data={ovelhas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListEmptyComponent={
          !carregando ? (
            <EmptyState
              icon={Heart}
              title={`Nenhum(a) ${terminologia.nome_ovelha.toLowerCase()} ainda`}
              description="Registre as pessoas que você acompanha pastoralmente."
              actionLabel={`+ Nova ${terminologia.nome_ovelha.toLowerCase()}`}
              onAction={() => setModalNova(true)}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const atrasada = reuniaoAtrasada(item);
          const critico = item.estado_espiritual === 'risco' || atrasada;
          const encontrosOvelha = encontrosPorOvelha.get(item.id) ?? [];
          const ultimoEncontro = [...encontrosOvelha].sort((a, b) => b.data.localeCompare(a.data))[0];
          const totalFrutos = frutosPorOvelha[item.id] ?? 0;
          return (
            <Pressable
              style={[styles.card, critico && styles.cardCritico]}
              onPress={() =>
                navigation.navigate('OvelhaDetalhe', { ovelhaId: item.id, nome: item.nome, pastorId: usuarioId })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>{item.nome.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.meta}>
                  {atrasada
                    ? 'Reunião em atraso'
                    : item.proxima_reuniao
                    ? `Próxima: ${new Date(item.proxima_reuniao).toLocaleDateString('pt-BR')}`
                    : 'Sem reunião agendada'}
                </Text>
                <Text style={styles.metaSecundaria}>
                  {ultimoEncontro ? `Último: ${new Date(ultimoEncontro.data).toLocaleDateString('pt-BR')}` : 'Sem encontros'}
                  {' · '}
                  {encontrosOvelha.length} encontro(s)
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <EstadoBadge estado={item.estado_espiritual} />
                {totalFrutos > 0 && (
                  <View style={styles.frutosBadge}>
                    <Sparkles size={11} color={colors.accent} />
                    <Text style={styles.frutosBadgeTexto}>{totalFrutos}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setModalNova(true)}>
        <Text style={styles.fabTexto}>+</Text>
      </Pressable>
    </View>
  );
}

function NovaOvelhaModal({
  visivel,
  onFechar,
  comunidadeId,
  pastorId,
  nomeOvelha,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  comunidadeId: string;
  pastorId: string;
  nomeOvelha: string;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) {
      toastErro('Informe o nome.');
      return;
    }
    setSalvando(true);
    try {
      await criarOvelha({ comunidade_id: comunidadeId, pastor_id: pastorId, nome: nome.trim(), telefone: telefone.trim() || undefined });
      setNome('');
      setTelefone('');
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso(`${nomeOvelha} adicionada!`);
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao adicionar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>Nova {nomeOvelha.toLowerCase()}</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome" placeholderTextColor={colors.textMuted} />
          <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Telefone (opcional)" placeholderTextColor={colors.textMuted} />
          <Button label="Adicionar" onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: 20, gap: 10, paddingBottom: 90 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  cardCritico: { borderColor: colors.dangerText, borderWidth: 1.5 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 13, fontWeight: '700', color: colors.primary },
  info: { flex: 1 },
  nome: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  metaSecundaria: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  frutosBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accentLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  frutosBadgeTexto: { fontSize: 11, fontWeight: '700', color: colors.accent },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeTexto: { fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: 'rgba(34,197,94,0.4)', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTexto: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  modalTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  input: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, marginTop: 8 },
});
