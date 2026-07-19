import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PartyPopper, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { listarContatosComunidade } from '../lib/funil';
import { ETAPAS_FUNIL, type Contato } from '../types/database';

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

function DateField({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: Date | null;
  onChange: (d: Date | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Pressable style={styles.dateInput} onPress={() => setAberto(true)}>
        <Text style={valor ? styles.dateTexto : styles.datePlaceholder}>
          {valor ? valor.toLocaleDateString('pt-BR') : 'Selecionar'}
        </Text>
      </Pressable>
      {valor && (
        <Pressable onPress={() => onChange(null)}>
          <Text style={styles.limpar}>limpar</Text>
        </Pressable>
      )}
      {aberto && (
        <DateTimePicker
          value={valor ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(evento, data) => {
            setAberto(false);
            if (evento.type === 'set' && data) onChange(data);
          }}
        />
      )}
    </View>
  );
}

export function FunilScreen({ comunidadeId }: { comunidadeId: string }) {
  const navigation = useNavigation<any>();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      listarContatosComunidade(comunidadeId)
        .then(setContatos)
        .finally(() => setCarregando(false));
    }, [comunidadeId])
  );

  const contatosFiltrados = useMemo(() => {
    const inicio = dataInicio ? dataInicio.toISOString().slice(0, 10) : null;
    const fim = dataFim ? dataFim.toISOString().slice(0, 10) : null;
    return contatos.filter((c) => {
      const data = c.data_abordagem.slice(0, 10);
      if (inicio && data < inicio) return false;
      if (fim && data > fim) return false;
      return true;
    });
  }, [contatos, dataInicio, dataFim]);

  const funil = useMemo(
    () =>
      ETAPAS_FUNIL.map((etapa, index) => {
        const total = contatosFiltrados.filter((c) => {
          const indice = ETAPAS_FUNIL.findIndex((e) => e.valor === c.etapa_jornada);
          return indice >= index;
        }).length;
        return { ...etapa, total };
      }),
    [contatosFiltrados]
  );

  const maiorTotal = funil[0]?.total || 1;

  const travados = useMemo(() => {
    const agora = Date.now();
    return contatosFiltrados.filter(
      (c) => c.etapa_jornada === 'abordagem' && agora - new Date(c.data_abordagem).getTime() > TRINTA_DIAS_MS
    );
  }, [contatosFiltrados]);

  function diasParado(contato: Contato) {
    return Math.floor((Date.now() - new Date(contato.data_abordagem).getTime()) / (24 * 60 * 60 * 1000));
  }

  if (carregando && contatos.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Funil de Evangelização</Text>
      <Text style={styles.subtitulo}>Acompanhe a jornada de cada pessoa</Text>

      <View style={styles.filtros}>
        <DateField label="De" valor={dataInicio} onChange={setDataInicio} />
        <DateField label="Até" valor={dataFim} onChange={setDataFim} />
      </View>

      <View style={styles.card}>
        {funil.map((etapa) => (
          <View key={etapa.valor} style={styles.funilItem}>
            <View style={styles.funilLinha}>
              <Text style={styles.funilLabel}>{etapa.label}</Text>
              <Text style={styles.funilNumero}>{etapa.total}</Text>
            </View>
            <ProgressBar percentual={(etapa.total / maiorTotal) * 100} />
          </View>
        ))}
      </View>

      <Text style={styles.secaoTitulo}>Travados há mais de 30 dias ({travados.length})</Text>
      {travados.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="Nenhum contato travado"
          description="Todo mundo está avançando na jornada. Continue assim!"
        />
      ) : (
        <View style={styles.card}>
          {travados.map((c) => (
            <Pressable
              key={c.id}
              style={styles.travadoItem}
              onPress={() =>
                navigation.navigate('MissaoTab', { screen: 'PerfilContato', params: { contatoId: c.id } })
              }
            >
              <View style={styles.travadoInfo}>
                <Text style={styles.travadoNome}>{c.nome}</Text>
                <Text style={styles.travadoDetalhe}>
                  {c.telefone ?? 'Sem telefone'} · {diasParado(c)} dias parado
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
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
  filtros: { flexDirection: 'row', gap: 12, marginTop: 16 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
  dateInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateTexto: { fontSize: 14, color: colors.text },
  datePlaceholder: { fontSize: 14, color: colors.textMuted },
  limpar: { fontSize: 11, color: colors.primary, marginTop: 4 },
  card: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  funilItem: { gap: 6 },
  funilLinha: { flexDirection: 'row', justifyContent: 'space-between' },
  funilLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  funilNumero: { fontSize: 14, color: colors.textMuted },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 24 },
  travadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  travadoInfo: { flex: 1 },
  travadoNome: { fontSize: 14, fontWeight: '600', color: colors.text },
  travadoDetalhe: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
