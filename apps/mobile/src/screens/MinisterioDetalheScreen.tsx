import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { TrendingUp, TrendingDown, Scale, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { HandHeart } from 'lucide-react-native';
import {
  atualizarEncontroComPresencas,
  criarEncontroComPresencas,
  lancarFinanceiro,
  listarEncontros,
  listarFinanceiro,
  listarMembros,
  listarPresencasDoEncontro,
  type MembroDetalhe,
} from '../lib/ministerios';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import {
  CATEGORIAS_FINANCEIRO,
  type MinisterioEncontro,
  type MinisterioFinanceiro,
  type MinisterioPresenca,
  type TipoFinanceiro,
} from '../types/database';

const STATUS_LABEL: Record<string, string> = { agendado: 'Agendado', realizado: 'Realizado', cancelado: 'Cancelado' };
const STATUS_COR: Record<string, string> = { agendado: colors.amber, realizado: colors.accent, cancelado: colors.textMuted };

type Aba = 'membros' | 'encontros' | 'caixa';
const CARGO_LABEL: Record<string, string> = { coordenador: 'Coordenador', 'vice-coordenador': 'Vice', membro: 'Membro' };

function inicioMesAtual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function MinisterioDetalheScreen() {
  const route = useRoute<any>();
  const { ministerioId, cargo, comunidadeId } = route.params as {
    ministerioId: string;
    nome: string;
    cargo: string;
    comunidadeId: string;
  };
  const isCoordenador = cargo === 'coordenador' || cargo === 'vice-coordenador';

  const [aba, setAba] = useState<Aba>('membros');
  const [membros, setMembros] = useState<MembroDetalhe[]>([]);
  const [encontros, setEncontros] = useState<MinisterioEncontro[]>([]);
  const [financeiro, setFinanceiro] = useState<MinisterioFinanceiro[]>([]);
  const [modalEncontro, setModalEncontro] = useState(false);
  const [encontroEditando, setEncontroEditando] = useState<MinisterioEncontro | null>(null);
  const [presencasEditando, setPresencasEditando] = useState<MinisterioPresenca[]>([]);
  const [modalLancamento, setModalLancamento] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(() => {
    return Promise.all([
      listarMembros(ministerioId).then(setMembros),
      listarEncontros(ministerioId).then(setEncontros),
      listarFinanceiro(ministerioId).then(setFinanceiro).catch(() => setFinanceiro([])),
    ]);
  }, [ministerioId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function atualizar() {
    setAtualizando(true);
    carregar().finally(() => setAtualizando(false));
  }

  function abrirNovoEncontro() {
    setEncontroEditando(null);
    setPresencasEditando([]);
    setModalEncontro(true);
  }

  async function abrirEncontroExistente(e: MinisterioEncontro) {
    const presencas = await listarPresencasDoEncontro(e.id).catch(() => []);
    setEncontroEditando(e);
    setPresencasEditando(presencas);
    setModalEncontro(true);
  }

  const { receitaMes, despesaMes, saldo } = useMemo(() => {
    const inicio = inicioMesAtual();
    const doMes = financeiro.filter((l) => l.data >= inicio);
    return {
      receitaMes: doMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0),
      despesaMes: doMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0),
      saldo: financeiro.reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0),
    };
  }, [financeiro]);

  return (
    <View style={styles.container}>
      <EncontroModal
        visivel={modalEncontro}
        onFechar={() => setModalEncontro(false)}
        ministerioId={ministerioId}
        membros={membros}
        encontroExistente={encontroEditando}
        presencasExistentes={presencasEditando}
        onSalvo={carregar}
      />
      <LancamentoModal
        visivel={modalLancamento}
        onFechar={() => setModalLancamento(false)}
        ministerioId={ministerioId}
        comunidadeId={comunidadeId}
        onSalvo={carregar}
      />

      <View style={styles.tabs}>
        {(['membros', 'encontros', 'caixa'] as Aba[]).map((a) => (
          <Pressable key={a} onPress={() => setAba(a)} style={[styles.tab, aba === a && styles.tabAtiva]}>
            <Text style={[styles.tabTexto, aba === a && styles.tabTextoAtivo]}>
              {a === 'membros' ? 'Membros' : a === 'encontros' ? 'Encontros' : 'Caixa'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={colors.primary} />}
      >
        {aba === 'membros' && (
          <View style={styles.lista}>
            {membros.map((m) => (
              <View key={m.id} style={styles.itemLinha}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTexto}>{m.nome.slice(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.itemNome}>{m.nome}</Text>
                <Text style={styles.itemMeta}>{CARGO_LABEL[m.cargo] ?? m.cargo}</Text>
              </View>
            ))}
            {membros.length === 0 && <Text style={styles.vazio}>Nenhum membro.</Text>}
          </View>
        )}

        {aba === 'encontros' && (
          <View>
            {isCoordenador && (
              <Button label="+ Registrar encontro" onPress={abrirNovoEncontro} style={styles.acao} />
            )}
            <View style={styles.lista}>
              {encontros.map((e) => (
                <Pressable
                  key={e.id}
                  style={styles.itemLinhaEntre}
                  onPress={() => (isCoordenador ? abrirEncontroExistente(e) : undefined)}
                >
                  <View>
                    <Text style={styles.itemNome}>{e.titulo}</Text>
                    <Text style={styles.itemMeta}>{new Date(e.data).toLocaleDateString('pt-BR')}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={[styles.statusTexto, { color: STATUS_COR[e.status] ?? colors.textMuted }]}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {encontros.length === 0 && (
                <EmptyState icon={HandHeart} title="Nenhum encontro registrado" />
              )}
            </View>
          </View>
        )}

        {aba === 'caixa' && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsResumo}>
              <MetricCard style={styles.cardResumo} icon={TrendingUp} iconColor={colors.accent} iconBg={colors.accentLight} label="Receitas do mês" value={`R$ ${receitaMes.toFixed(2)}`} />
              <MetricCard style={styles.cardResumo} icon={TrendingDown} iconColor={colors.dangerText} iconBg={colors.dangerLight} label="Despesas do mês" value={`R$ ${despesaMes.toFixed(2)}`} />
              <MetricCard style={styles.cardResumo} icon={Scale} iconColor={saldo >= 0 ? colors.accent : colors.dangerText} iconBg={saldo >= 0 ? colors.accentLight : colors.dangerLight} valorColor={saldo >= 0 ? colors.accent : colors.dangerText} label="Saldo" value={`R$ ${saldo.toFixed(2)}`} />
            </ScrollView>

            {isCoordenador && (
              <Button label="+ Lançamento" onPress={() => setModalLancamento(true)} style={styles.acao} />
            )}

            <View style={styles.lista}>
              {financeiro.map((l) => (
                <View key={l.id} style={styles.itemLinhaEntre}>
                  <View>
                    <Text style={styles.itemNome}>{l.categoria}</Text>
                    {!!l.descricao && <Text style={styles.itemMeta}>{l.descricao}</Text>}
                  </View>
                  <Text style={{ color: l.tipo === 'receita' ? colors.accent : colors.dangerText, fontWeight: '700' }}>
                    R$ {Number(l.valor).toFixed(2)}
                  </Text>
                </View>
              ))}
              {financeiro.length === 0 && <Text style={styles.vazio}>Nenhum lançamento.</Text>}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------- Modal de encontro (com presença) ----------------
function EncontroModal({
  visivel,
  onFechar,
  ministerioId,
  membros,
  encontroExistente,
  presencasExistentes,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  ministerioId: string;
  membros: MembroDetalhe[];
  encontroExistente?: MinisterioEncontro | null;
  presencasExistentes?: MinisterioPresenca[];
  onSalvo: () => void;
}) {
  const [titulo, setTitulo] = useState('Reunião');
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const editando = !!encontroExistente;

  useEffect(() => {
    if (!visivel) return;
    if (encontroExistente) {
      setTitulo(encontroExistente.titulo);
      const mapa: Record<string, boolean> = {};
      for (const p of presencasExistentes ?? []) {
        if (p.usuario_id) mapa[p.usuario_id] = p.presente;
      }
      setPresencas(mapa);
    } else {
      setTitulo('Reunião');
      setPresencas({});
    }
  }, [visivel, encontroExistente, presencasExistentes]);

  function togglePresenca(usuarioId: string) {
    setPresencas((p) => ({ ...p, [usuarioId]: !(p[usuarioId] ?? true) }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const listaPresencas = membros.map((m) => ({ usuario_id: m.usuario_id, presente: presencas[m.usuario_id] ?? true }));
      if (encontroExistente) {
        await atualizarEncontroComPresencas(
          encontroExistente.id,
          { titulo: titulo.trim() || 'Reunião', data: encontroExistente.data },
          listaPresencas
        );
        toastSucesso('Presença atualizada!');
      } else {
        await criarEncontroComPresencas(
          { ministerio_id: ministerioId, titulo: titulo.trim() || 'Reunião', data: new Date().toISOString().slice(0, 10) },
          listaPresencas
        );
        toastSucesso('Encontro registrado!');
      }
      onSalvo();
      onFechar();
      hapticoSucesso();
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
            <Text style={styles.modalTitulo}>{editando ? 'Completar encontro' : 'Registrar encontro'}</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Título" placeholderTextColor={colors.textMuted} />
          <Text style={styles.campoLabel}>Presença</Text>
          <ScrollView style={{ maxHeight: 240 }}>
            {membros.map((m) => {
              const presente = presencas[m.usuario_id] ?? true;
              return (
                <Pressable key={m.usuario_id} style={styles.presencaLinha} onPress={() => togglePresenca(m.usuario_id)}>
                  <Text style={styles.itemNome}>{m.nome}</Text>
                  <Text style={{ color: presente ? colors.accent : colors.dangerText, fontWeight: '700' }}>
                    {presente ? 'Presente' : 'Ausente'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button label={editando ? 'Salvar presença' : 'Salvar encontro'} onPress={salvar} loading={salvando} style={styles.acao} />
        </View>
      </View>
    </Modal>
  );
}

// ---------------- Modal de lançamento ----------------
function LancamentoModal({
  visivel,
  onFechar,
  ministerioId,
  comunidadeId,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  ministerioId: string;
  comunidadeId: string;
  onSalvo: () => void;
}) {
  const [tipo, setTipo] = useState<TipoFinanceiro>('receita');
  const [categoria, setCategoria] = useState<string>('doacao');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date());
  const [mostrarData, setMostrarData] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const v = Number(valor.replace(',', '.'));
    if (!v) {
      toastErro('Informe um valor válido.');
      return;
    }
    setSalvando(true);
    try {
      await lancarFinanceiro({
        ministerio_id: ministerioId,
        comunidade_id: comunidadeId,
        tipo,
        categoria,
        valor: v,
        data: data.toISOString().slice(0, 10),
      });
      setValor('');
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso('Lançamento salvo!');
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>Novo lançamento</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.segmento}>
            {(['receita', 'despesa'] as TipoFinanceiro[]).map((t) => (
              <Pressable key={t} onPress={() => setTipo(t)} style={[styles.segItem, tipo === t && styles.segItemAtivo]}>
                <Text style={[styles.segTexto, tipo === t && styles.segTextoAtivo]}>{t === 'receita' ? 'Receita' : 'Despesa'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.campoLabel}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['doacao', ...CATEGORIAS_FINANCEIRO].map((c) => (
              <Pressable key={c} onPress={() => setCategoria(c)} style={[styles.chip, categoria === c && styles.chipAtivo]}>
                <Text style={[styles.chipTexto, categoria === c && styles.chipTextoAtivo]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput style={styles.input} value={valor} onChangeText={setValor} placeholder="Valor (R$)" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
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
          <Button label="Salvar" onPress={salvar} loading={salvando} style={styles.acao} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabAtiva: { borderBottomColor: colors.primary },
  tabTexto: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  tabTextoAtivo: { color: colors.primary },
  conteudo: { padding: 20 },
  lista: { gap: 10, marginTop: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  itemLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  itemLinhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemNome: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted },
  vazio: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.background },
  statusTexto: { fontSize: 11, fontWeight: '700' },
  acao: { marginTop: 12 },
  cardsResumo: { gap: 12, paddingRight: 4 },
  cardResumo: { width: 150 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  modalTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, marginTop: 8 },
  presencaLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  segmento: { flexDirection: 'row', gap: 8, marginTop: 4 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  segItemAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  segTexto: { fontSize: 13, color: colors.text, fontWeight: '600' },
  segTextoAtivo: { color: '#fff' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.text },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
});
