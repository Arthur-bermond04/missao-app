import React, { useCallback, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, HandHeart, HeartHandshake, Sparkle, Tent, Trash2, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  criarEventoAvulso,
  excluirEventoAvulso,
  listarEventosAgenda,
  TIPOS_EVENTO_AVULSO,
  type EventoAgenda,
  type TipoEventoAgenda,
  type TipoEventoAvulso,
  type VisibilidadeEvento,
} from '../lib/agenda';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import type { Perfil } from '../types/database';

const PERFIS_GESTAO: Perfil[] = ['coordenador', 'padre', 'admin'];

const ICONE: Record<TipoEventoAgenda, typeof HandHeart> = {
  ministerio: HandHeart,
  pastoral: HeartHandshake,
  retiro: Tent,
  avulso: Sparkle,
};
const COR: Record<TipoEventoAgenda, string> = {
  ministerio: colors.primary,
  pastoral: colors.info,
  retiro: '#7C3AED',
  avulso: colors.warning,
};

export function AgendaScreen({ comunidadeId, usuarioId, perfil }: { comunidadeId: string; usuarioId: string; perfil: Perfil }) {
  const podeGerir = PERFIS_GESTAO.includes(perfil);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<EventoAgenda | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarEventosAgenda(comunidadeId)
      .then(setEventos)
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  useFocusEffect(useCallback(() => carregar(), [carregar]));

  async function handleExcluir() {
    if (!paraExcluir) return;
    await excluirEventoAvulso(paraExcluir.id);
    toastSucesso('Evento excluído.');
    setParaExcluir(null);
    carregar();
  }

  return (
    <View style={styles.container}>
      {modalNovo && (
        <NovoEventoModal
          comunidadeId={comunidadeId}
          usuarioId={usuarioId}
          onFechar={() => setModalNovo(false)}
          onSalvo={() => {
            setModalNovo(false);
            carregar();
          }}
        />
      )}
      <ConfirmModal
        visivel={!!paraExcluir}
        onFechar={() => setParaExcluir(null)}
        onConfirmar={handleExcluir}
        titulo="Excluir evento?"
        descricao={`${paraExcluir?.titulo ?? 'Este evento'} será removido da agenda.`}
        labelConfirmar="Excluir"
      />

      <FlatList
        data={eventos}
        keyExtractor={(e) => `${e.tipo}-${e.id}`}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListHeaderComponent={
          <View style={styles.legenda}>
            {(['ministerio', 'pastoral', 'retiro', 'avulso'] as TipoEventoAgenda[]).map((t) => (
              <View key={t} style={styles.legItem}>
                <View style={[styles.dot, { backgroundColor: COR[t] }]} />
                <Text style={styles.legTexto}>
                  {t === 'ministerio' ? 'Ministério' : t === 'pastoral' ? 'Pastoral' : t === 'retiro' ? 'Retiro' : 'Avulso'}
                </Text>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={
          !carregando ? (
            <EmptyState
              icon={Calendar}
              title="Nenhum evento futuro"
              description="Cadastre um evento avulso, ou aguarde encontros, reuniões e retiros aparecerem aqui."
              actionLabel={podeGerir ? '+ Novo evento' : undefined}
              onAction={podeGerir ? () => setModalNovo(true) : undefined}
            />
          ) : null
        }
        renderItem={({ item: e }) => {
          const Icon = ICONE[e.tipo];
          return (
            <View style={styles.item}>
              <View style={[styles.iconeCirc, { backgroundColor: COR[e.tipo] + '22' }]}>
                <Icon size={15} color={COR[e.tipo]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitulo}>{e.titulo}</Text>
                {!!e.subtitulo && <Text style={styles.itemSub}>{e.subtitulo}</Text>}
              </View>
              <Text style={styles.itemData}>{new Date(e.data).toLocaleDateString('pt-BR')}</Text>
              {e.tipo === 'avulso' && podeGerir && (
                <Pressable onPress={() => setParaExcluir(e)} hitSlop={8} style={{ marginLeft: 6 }}>
                  <Trash2 size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {podeGerir && (
        <Pressable style={styles.fab} onPress={() => setModalNovo(true)}>
          <Text style={styles.fabTexto}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

function NovoEventoModal({
  comunidadeId,
  usuarioId,
  onFechar,
  onSalvo,
}: {
  comunidadeId: string;
  usuarioId: string;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(new Date());
  const [mostrarData, setMostrarData] = useState(false);
  const [local, setLocal] = useState('');
  const [tipo, setTipo] = useState<TipoEventoAvulso>('geral');
  const [visivel, setVisivel] = useState<VisibilidadeEvento>('todos');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo.trim()) {
      toastErro('Informe o título.');
      return;
    }
    setSalvando(true);
    try {
      await criarEventoAvulso({
        comunidade_id: comunidadeId,
        criado_por: usuarioId,
        titulo: titulo.trim(),
        local: local.trim() || undefined,
        data_inicio: `${data.toISOString().slice(0, 10)}T00:00:00`,
        dia_inteiro: true,
        tipo,
        visivel_para: visivel,
      });
      hapticoSucesso();
      toastSucesso('Evento criado!');
      onSalvo();
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao criar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>Novo evento</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Título" placeholderTextColor={colors.textSecondary} />
          <Pressable style={styles.input} onPress={() => setMostrarData(true)}>
            <Text style={{ color: colors.textPrimary }}>{data.toLocaleDateString('pt-BR')}</Text>
          </Pressable>
          {mostrarData && (
            <DateTimePicker
              value={data}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(ev, d) => { setMostrarData(false); if (ev.type === 'set' && d) setData(d); }}
            />
          )}
          <TextInput style={styles.input} value={local} onChangeText={setLocal} placeholder="Local (opcional)" placeholderTextColor={colors.textSecondary} />

          <Text style={styles.campoLabel}>Tipo</Text>
          <View style={styles.chipsWrap}>
            {TIPOS_EVENTO_AVULSO.map((t) => (
              <Pressable key={t.valor} onPress={() => setTipo(t.valor)} style={[styles.chip, tipo === t.valor && styles.chipAtivo]}>
                <Text style={[styles.chipTexto, tipo === t.valor && styles.chipTextoAtivo]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.campoLabel}>Visível para</Text>
          <View style={styles.chipsWrap}>
            {(['todos', 'lideranca', 'missionarios'] as VisibilidadeEvento[]).map((v) => (
              <Pressable key={v} onPress={() => setVisivel(v)} style={[styles.chip, visivel === v && styles.chipAtivo]}>
                <Text style={[styles.chipTexto, visivel === v && styles.chipTextoAtivo]}>
                  {v === 'todos' ? 'Todos' : v === 'lideranca' ? 'Liderança' : 'Missionários'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button label="Criar evento" onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  lista: { padding: 16, gap: 8, paddingBottom: 90 },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legTexto: { fontSize: 11, color: colors.textSecondary },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  iconeCirc: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemTitulo: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  itemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  itemData: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabTexto: { color: '#fff', fontSize: 28, lineHeight: 30 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 20 },
  modalTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 15, marginTop: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.textPrimary },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
});
