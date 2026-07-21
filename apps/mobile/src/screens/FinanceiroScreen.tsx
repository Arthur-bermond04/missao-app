import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp, TrendingDown, Scale, Wallet, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { lancarFinanceiro, listarFinanceiro } from '../lib/financeiro';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import { CATEGORIAS_FINANCEIRO, type Financeiro, type TipoFinanceiro } from '../types/database';

function inicioMesAtual() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

interface LancamentoModalProps {
  visivel: boolean;
  tipo: TipoFinanceiro;
  onFechar: () => void;
  onSalvar: (dados: { categoria: string; descricao: string; valor: string; data: Date }) => void;
  salvando: boolean;
}

function LancamentoModal({ visivel, tipo, onFechar, onSalvar, salvando }: LancamentoModalProps) {
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_FINANCEIRO[0]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date());
  const [mostrarData, setMostrarData] = useState(false);

  function fechar() {
    setCategoria(CATEGORIAS_FINANCEIRO[0]);
    setDescricao('');
    setValor('');
    setData(new Date());
    onFechar();
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>{tipo === 'receita' ? 'Nova receita' : 'Nova despesa'}</Text>
            <Pressable onPress={fechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.campoLabel}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {CATEGORIAS_FINANCEIRO.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategoria(c)}
                style={[styles.chip, categoria === c && styles.chipAtivo]}
              >
                <Text style={[styles.chipTexto, categoria === c && styles.chipTextoAtivo]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.campoLabel}>Descrição (opcional)</Text>
          <TextInput
            style={styles.input}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Descrição"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.campoLabel}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            value={valor}
            onChangeText={setValor}
            placeholder="0,00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={styles.campoLabel}>Data</Text>
          <Pressable style={styles.input} onPress={() => setMostrarData(true)}>
            <Text style={styles.dateTexto}>{data.toLocaleDateString('pt-BR')}</Text>
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

          <Button
            label="Salvar"
            variant={tipo === 'receita' ? 'success' : 'primary'}
            loading={salvando}
            onPress={() => onSalvar({ categoria, descricao, valor, data })}
            style={styles.salvar}
          />
        </View>
      </View>
    </Modal>
  );
}

export function FinanceiroScreen({ comunidadeId }: { comunidadeId: string }) {
  const [lancamentos, setLancamentos] = useState<Financeiro[]>([]);
  const [modalTipo, setModalTipo] = useState<TipoFinanceiro | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(() => {
    return listarFinanceiro(comunidadeId).then(setLancamentos);
  }, [comunidadeId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function atualizar() {
    setAtualizando(true);
    carregar().finally(() => setAtualizando(false));
  }

  const { receitaMes, despesaMes } = useMemo(() => {
    const inicio = inicioMesAtual();
    const doMes = lancamentos.filter((l) => l.data >= inicio);
    return {
      receitaMes: doMes.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0),
      despesaMes: doMes.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0),
    };
  }, [lancamentos]);
  const saldoMes = receitaMes - despesaMes;

  async function handleSalvar(dados: { categoria: string; descricao: string; valor: string; data: Date }) {
    const valorNumero = Number(dados.valor.replace(',', '.'));
    if (!valorNumero || !modalTipo) {
      toastErro('Informe um valor válido.');
      return;
    }
    setSalvando(true);
    try {
      const novo = await lancarFinanceiro({
        comunidade_id: comunidadeId,
        tipo: modalTipo,
        categoria: dados.categoria,
        descricao: dados.descricao.trim() || undefined,
        valor: valorNumero,
        data: dados.data.toISOString().slice(0, 10),
      });
      setLancamentos((atual) => [novo, ...atual]);
      setModalTipo(null);
      hapticoSucesso();
      toastSucesso(modalTipo === 'receita' ? 'Receita lançada!' : 'Despesa lançada!');
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={colors.primary} />}
      >
        <Text style={styles.titulo}>Financeiro</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsResumo}
        >
          <MetricCard
            style={styles.cardResumo}
            icon={TrendingUp}
            iconColor={colors.accent}
            iconBg={colors.accentLight}
            label="Receitas do mês"
            value={`R$ ${receitaMes.toFixed(2)}`}
          />
          <MetricCard
            style={styles.cardResumo}
            icon={TrendingDown}
            iconColor={colors.dangerText}
            iconBg={colors.dangerLight}
            label="Despesas do mês"
            value={`R$ ${despesaMes.toFixed(2)}`}
          />
          <MetricCard
            style={styles.cardResumo}
            icon={Scale}
            iconColor={saldoMes >= 0 ? colors.accent : colors.dangerText}
            iconBg={saldoMes >= 0 ? colors.accentLight : colors.dangerLight}
            label="Saldo do mês"
            value={`R$ ${saldoMes.toFixed(2)}`}
          />
        </ScrollView>

        <View style={styles.botoes}>
          <Button label="+ Receita" variant="success" onPress={() => setModalTipo('receita')} style={styles.botao} />
          <Button label="- Despesa" variant="danger" onPress={() => setModalTipo('despesa')} style={styles.botao} />
        </View>

        <Text style={styles.secaoTitulo}>Lançamentos recentes</Text>
        {lancamentos.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhum lançamento ainda"
            description="Registre a primeira receita ou despesa da sua comunidade."
          />
        ) : (
          <View style={styles.lista}>
            {lancamentos.map((l) => (
              <View key={l.id} style={styles.lancItem}>
                <View style={styles.lancInfo}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: l.tipo === 'receita' ? colors.accentLight : colors.dangerLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeTexto,
                        { color: l.tipo === 'receita' ? colors.accent : colors.dangerText },
                      ]}
                    >
                      {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Text>
                  </View>
                  <Text style={styles.lancCategoria}>{l.categoria}</Text>
                  {!!l.descricao && <Text style={styles.lancDescricao}>{l.descricao}</Text>}
                </View>
                <View style={styles.lancDireita}>
                  <Text
                    style={[
                      styles.lancValor,
                      { color: l.tipo === 'receita' ? colors.accent : colors.dangerText },
                    ]}
                  >
                    R$ {l.valor.toFixed(2)}
                  </Text>
                  <Text style={styles.lancData}>{new Date(l.data).toLocaleDateString('pt-BR')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {modalTipo && (
        <LancamentoModal
          visivel={modalTipo !== null}
          tipo={modalTipo}
          salvando={salvando}
          onFechar={() => setModalTipo(null)}
          onSalvar={handleSalvar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: '800', color: colors.text },
  cardsResumo: { gap: 12, marginTop: 16, paddingRight: 4 },
  cardResumo: { width: 150 },
  botoes: { flexDirection: 'row', gap: 12, marginTop: 16 },
  botao: { flex: 1 },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 24 },
  lista: { marginTop: 12, gap: 10 },
  lancItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lancInfo: { flex: 1, gap: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  lancCategoria: { fontSize: 14, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  lancDescricao: { fontSize: 12, color: colors.textMuted },
  lancDireita: { alignItems: 'flex-end', justifyContent: 'center' },
  lancValor: { fontSize: 15, fontWeight: '700' },
  lancData: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  modalTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 14, marginBottom: 6 },
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.text, textTransform: 'capitalize' },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
  },
  dateTexto: { fontSize: 15, color: colors.text },
  salvar: { marginTop: 20 },
});
