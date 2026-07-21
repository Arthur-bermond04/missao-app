import React, { useCallback, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Lock, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { buscarOvelha, criarEncontroPastoral, listarEncontrosPastorais } from '../lib/pastoral';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import {
  ESTADOS_ESPIRITUAL,
  ESTADOS_OVELHA_ENCONTRO,
  type EstadoOvelhaEncontro,
  type PastoralEncontro,
  type PastoralOvelha,
  type TipoEncontroPastoral,
} from '../types/database';

const TIPOS: { valor: TipoEncontroPastoral; label: string }[] = [
  { valor: 'presencial', label: 'Presencial' },
  { valor: 'online', label: 'Online' },
  { valor: 'telefone', label: 'Telefone' },
  { valor: 'mensagem', label: 'Mensagem' },
];

export function OvelhaDetalheScreen() {
  const route = useRoute<any>();
  const { ovelhaId, pastorId } = route.params as { ovelhaId: string; nome: string; pastorId: string };

  const [ovelha, setOvelha] = useState<PastoralOvelha | null>(null);
  const [encontros, setEncontros] = useState<PastoralEncontro[]>([]);
  const [modal, setModal] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(() => {
    return Promise.all([buscarOvelha(ovelhaId).then(setOvelha), listarEncontrosPastorais(ovelhaId).then(setEncontros)]);
  }, [ovelhaId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function atualizar() {
    setAtualizando(true);
    carregar().finally(() => setAtualizando(false));
  }

  const estadoCfg = ovelha ? ESTADOS_ESPIRITUAL.find((e) => e.valor === ovelha.estado_espiritual) : null;

  return (
    <View style={styles.container}>
      <EncontroPastoralModal
        visivel={modal}
        onFechar={() => setModal(false)}
        ovelhaId={ovelhaId}
        pastorId={pastorId}
        onSalvo={carregar}
      />

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={colors.primary} />}
      >
        {ovelha && (
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{ovelha.nome.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{ovelha.nome}</Text>
              <View style={[styles.badge, { backgroundColor: (estadoCfg?.cor ?? colors.primary) + '22' }]}>
                <Text style={{ color: estadoCfg?.cor ?? colors.primary, fontSize: 12, fontWeight: '600' }}>
                  {estadoCfg?.label ?? ovelha.estado_espiritual}
                </Text>
              </View>
              {!!ovelha.proxima_reuniao && (
                <Text style={styles.meta}>Próxima: {new Date(ovelha.proxima_reuniao).toLocaleDateString('pt-BR')}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.privacidade}>
          <Lock size={14} color={colors.primary} />
          <Text style={styles.privacidadeTexto}>Registros confidenciais — visíveis só por você e pelo admin.</Text>
        </View>

        <Button label="+ Registrar encontro" onPress={() => setModal(true)} style={{ marginTop: 12 }} />

        <Text style={styles.secaoTitulo}>Histórico de encontros</Text>
        {encontros.length === 0 ? (
          <Text style={styles.vazio}>Nenhum encontro registrado ainda.</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {encontros.map((e) => {
              const est = ESTADOS_OVELHA_ENCONTRO.find((x) => x.valor === e.estado_ovelha);
              return (
                <View key={e.id} style={styles.card}>
                  <View style={styles.cardTopo}>
                    <Text style={styles.itemNome}>{new Date(e.data).toLocaleDateString('pt-BR')}</Text>
                    <Text style={styles.itemMeta}>
                      {est?.emoji} {e.tipo}
                    </Text>
                  </View>
                  <Text style={styles.relato}>{e.relato}</Text>
                  {!!e.encaminhamentos && <Text style={styles.encaminhamentos}>→ {e.encaminhamentos}</Text>}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EncontroPastoralModal({
  visivel,
  onFechar,
  ovelhaId,
  pastorId,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  ovelhaId: string;
  pastorId: string;
  onSalvo: () => void;
}) {
  const [data, setData] = useState(new Date());
  const [mostrarData, setMostrarData] = useState(false);
  const [tipo, setTipo] = useState<TipoEncontroPastoral>('presencial');
  const [estado, setEstado] = useState<EstadoOvelhaEncontro>('estavel');
  const [relato, setRelato] = useState('');
  const [encaminhamentos, setEncaminhamentos] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (relato.trim().length < 3) {
      toastErro('Escreva um relato.');
      return;
    }
    setSalvando(true);
    try {
      await criarEncontroPastoral({
        ovelha_id: ovelhaId,
        pastor_id: pastorId,
        data: data.toISOString().slice(0, 10),
        tipo,
        estado_ovelha: estado,
        relato: relato.trim(),
        encaminhamentos: encaminhamentos.trim() || undefined,
      });
      setRelato('');
      setEncaminhamentos('');
      setEstado('estavel');
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso('Encontro registrado!');
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao registrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>Registrar encontro</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }}>
            <Pressable style={styles.input} onPress={() => setMostrarData(true)}>
              <Text style={{ color: colors.text }}>{data.toLocaleDateString('pt-BR')}</Text>
            </Pressable>
            {mostrarData && (
              <DateTimePicker
                value={data}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(evento, d) => {
                  setMostrarData(false);
                  if (evento.type === 'set' && d) setData(d);
                }}
              />
            )}

            <Text style={styles.campoLabel}>Tipo</Text>
            <View style={styles.chipsWrap}>
              {TIPOS.map((t) => (
                <Pressable key={t.valor} onPress={() => setTipo(t.valor)} style={[styles.chip, tipo === t.valor && styles.chipAtivo]}>
                  <Text style={[styles.chipTexto, tipo === t.valor && styles.chipTextoAtivo]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.campoLabel}>Como a ovelha estava</Text>
            <View style={styles.chipsWrap}>
              {ESTADOS_OVELHA_ENCONTRO.map((e) => (
                <Pressable key={e.valor} onPress={() => setEstado(e.valor)} style={[styles.chip, estado === e.valor && styles.chipAtivo]}>
                  <Text style={[styles.chipTexto, estado === e.valor && styles.chipTextoAtivo]}>
                    {e.emoji} {e.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.campoLabel}>Relato</Text>
            <TextInput style={[styles.input, { height: 100 }]} value={relato} onChangeText={setRelato} multiline textAlignVertical="top" placeholder="O que foi conversado..." placeholderTextColor={colors.textMuted} />

            <Text style={styles.campoLabel}>Encaminhamentos</Text>
            <TextInput style={styles.input} value={encaminhamentos} onChangeText={setEncaminhamentos} placeholder="O que foi combinado (opcional)" placeholderTextColor={colors.textMuted} />
          </ScrollView>

          <Button label="Salvar" onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 18, fontWeight: '700', color: colors.primary },
  nome: { fontSize: 18, fontWeight: '800', color: colors.text },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  privacidade: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginTop: 16 },
  privacidadeTexto: { flex: 1, fontSize: 12, color: colors.primary },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 24 },
  vazio: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemNome: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted },
  relato: { fontSize: 14, color: colors.text, lineHeight: 20 },
  encaminhamentos: { fontSize: 13, color: colors.textMuted, marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  modalTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, marginTop: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.text },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
});
