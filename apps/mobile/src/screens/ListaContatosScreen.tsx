import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../components/Avatar';
import { BadgeInteresse } from '../components/BadgeInteresse';
import { colors } from '../theme/colors';
import { useContatos } from '../lib/useContatos';
import type { Contato, NivelInteresse } from '../types/database';

const FILTROS: { label: string; valor: NivelInteresse | 'todos' }[] = [
  { label: 'Todos', valor: 'todos' },
  { label: '🔥 Quentes', valor: 'quente' },
  { label: '💧 Mornos', valor: 'morno' },
  { label: '❄️ Frios', valor: 'frio' },
];

const LIMITE_PLANO_GRATIS = 50;

function lembreteVenceHoje(contato: Contato) {
  if (!contato.proximo_contato) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return contato.proximo_contato === hoje;
}

export function ListaContatosScreen({
  comunidadeId,
  missionarioId,
  plano = 'semente',
}: {
  comunidadeId: string;
  missionarioId: string;
  plano?: 'semente' | 'missao' | 'diocese';
}) {
  const navigation = useNavigation<any>();
  const { contatos, carregando } = useContatos(comunidadeId, missionarioId);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<NivelInteresse | 'todos'>('todos');

  const contatosFiltrados = useMemo(() => {
    return contatos.filter((c) => {
      const bateBusca =
        !busca ||
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (c.telefone ?? '').includes(busca);
      const bateFiltro = filtro === 'todos' || c.nivel_interesse === filtro;
      return bateBusca && bateFiltro;
    });
  }, [contatos, busca, filtro]);

  const total = contatos.length;
  const contadorLabel =
    plano === 'semente' ? `${total} de ${LIMITE_PLANO_GRATIS} contatos` : `${total} contatos`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Minha Missão</Text>
        <Text style={styles.contador}>{contadorLabel}</Text>
      </View>

      <TextInput
        style={styles.busca}
        placeholder="Buscar por nome ou telefone"
        placeholderTextColor={colors.textMuted}
        value={busca}
        onChangeText={setBusca}
      />

      <View style={styles.chips}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.valor}
            onPress={() => setFiltro(f.valor)}
            style={[styles.chip, filtro === f.valor && styles.chipAtivo]}
          >
            <Text style={[styles.chipTexto, filtro === f.valor && styles.chipTextoAtivo]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={contatosFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            Nenhum contato ainda. Toque em "+" para registrar a primeira abordagem.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, lembreteVenceHoje(item) && styles.cardLembreteHoje]}
            onPress={() => navigation.navigate('PerfilContato', { contatoId: item.id })}
          >
            <Avatar nome={item.nome} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardNome}>{item.nome}</Text>
              <Text style={styles.cardLocal} numberOfLines={1}>
                {item.local_abordagem ?? 'Local não informado'} ·{' '}
                {new Date(item.data_abordagem).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <View style={styles.cardDireita}>
              <BadgeInteresse nivel={item.nivel_interesse} />
              {!item.sincronizado && <Text style={styles.pendente}>⏳ pendente</Text>}
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('CadastroContato')}
        accessibilityLabel="Cadastrar novo contato"
      >
        <Text style={styles.fabTexto}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  titulo: { fontSize: 24, fontWeight: '800', color: colors.text },
  contador: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  busca: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.text },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
  lista: { padding: 20, paddingBottom: 100, gap: 10 },
  vazio: { textAlign: 'center', color: colors.textMuted, marginTop: 60 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLembreteHoje: {
    borderColor: colors.warning,
    borderWidth: 1.5,
  },
  cardInfo: { flex: 1 },
  cardNome: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardLocal: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardDireita: { alignItems: 'flex-end', gap: 4 },
  pendente: { fontSize: 10, color: colors.textMuted },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabTexto: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '400' },
});
