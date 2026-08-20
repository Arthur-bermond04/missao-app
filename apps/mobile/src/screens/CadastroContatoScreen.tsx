import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { useContatos } from '../lib/useContatos';
import { buscarComunidade } from '../lib/comunidades';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import { TAGS_INTERESSE } from '../types/database';
import type { NivelInteresse } from '../types/database';

const NIVEIS: { valor: NivelInteresse; emoji: string; label: string; cor: string }[] = [
  { valor: 'quente', emoji: '🔥', label: 'Quente', cor: colors.quente },
  { valor: 'morno', emoji: '💧', label: 'Morno', cor: colors.morno },
  { valor: 'frio', emoji: '❄️', label: 'Frio', cor: colors.frio },
];

export function CadastroContatoScreen({
  comunidadeId,
  missionarioId,
}: {
  comunidadeId: string;
  missionarioId: string;
}) {
  const navigation = useNavigation<any>();
  const { contatos, novoContato } = useContatos(comunidadeId, missionarioId);
  const [maxContatos, setMaxContatos] = useState<number | null>(null);

  useEffect(() => {
    buscarComunidade(comunidadeId).then((c) => setMaxContatos(c?.max_contatos ?? null));
  }, [comunidadeId]);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [idade, setIdade] = useState('');
  const [nivelInteresse, setNivelInteresse] = useState<NivelInteresse>('morno');
  const [localAbordagem, setLocalAbordagem] = useState('');
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null);
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const pos = await Location.getCurrentPositionAsync({});
        setCoordenadas({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const [end] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (end) {
          const partes = [end.street, end.subregion || end.city].filter(Boolean);
          setLocalAbordagem(partes.join(', '));
        }
      } catch {
        // Falha silenciosa: usuário pode preencher o local manualmente
      }
    })();
  }, []);

  function alternarTag(tag: string) {
    setTagsSelecionadas((atual) =>
      atual.includes(tag) ? atual.filter((t) => t !== tag) : [...atual, tag]
    );
  }

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome da pessoa.');
      return;
    }
    if (maxContatos != null && contatos.length >= maxContatos) {
      Alert.alert(
        'Limite do plano atingido',
        `Sua comunidade já usou os ${maxContatos} contatos do plano Semente. Fale com a equipe para fazer upgrade e continuar cadastrando.`
      );
      return;
    }
    setSalvando(true);
    try {
      const id = await novoContato({
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        idade: idade ? Number(idade) : undefined,
        nivel_interesse: nivelInteresse,
        local_abordagem: localAbordagem.trim() || undefined,
        latitude: coordenadas?.lat,
        longitude: coordenadas?.lng,
        tags: tagsSelecionadas,
        observacoes: observacoes.trim() || undefined,
      });
      hapticoSucesso();
      navigation.replace('ConfirmacaoContato', {
        contatoId: id,
        nome: nome.trim(),
        telefone: telefone.trim(),
        localAbordagem: localAbordagem.trim(),
        nivelInteresse,
      });
    } catch (e: any) {
      hapticoErro();
      Alert.alert('Erro ao salvar', e?.message ?? 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Nova pessoa abordada</Text>

      <Text style={styles.label}>Nome *</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Nome da pessoa"
        placeholderTextColor={colors.textSecondary}
        autoFocus
      />

      <Text style={styles.label}>Telefone / WhatsApp</Text>
      <TextInput
        style={styles.input}
        value={telefone}
        onChangeText={setTelefone}
        placeholder="(00) 00000-0000"
        placeholderTextColor={colors.textSecondary}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Idade (opcional)</Text>
      <TextInput
        style={styles.input}
        value={idade}
        onChangeText={setIdade}
        placeholder="Idade"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Nível de interesse</Text>
      <View style={styles.nivelRow}>
        {NIVEIS.map((n) => (
          <Pressable
            key={n.valor}
            onPress={() => setNivelInteresse(n.valor)}
            style={[
              styles.nivelBotao,
              { borderColor: n.cor },
              nivelInteresse === n.valor && { backgroundColor: n.cor + '22' },
            ]}
          >
            <Text style={styles.nivelEmoji}>{n.emoji}</Text>
            <Text style={[styles.nivelLabel, { color: n.cor }]}>{n.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Local da abordagem</Text>
      <TextInput
        style={styles.input}
        value={localAbordagem}
        onChangeText={setLocalAbordagem}
        placeholder="Detectando localização..."
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Tags de interesse</Text>
      <View style={styles.tagsRow}>
        {TAGS_INTERESSE.map((tag) => {
          const ativo = tagsSelecionadas.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => alternarTag(tag)}
              style={[styles.tagChip, ativo && styles.tagChipAtivo]}
            >
              <Text style={[styles.tagTexto, ativo && styles.tagTextoAtivo]}>{tag}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Observações</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Alguma observação sobre a conversa..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
      />

      <Pressable
        style={[styles.salvarBotao, salvando && styles.salvarBotaoDesabilitado]}
        onPress={salvar}
        disabled={salvando}
      >
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.salvarTexto}>Salvar contato</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  conteudo: { padding: 20, paddingBottom: 60 },
  titulo: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 15,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  nivelRow: { flexDirection: 'row', gap: 10 },
  nivelBotao: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  nivelEmoji: { fontSize: 24 },
  nivelLabel: { fontWeight: '700', marginTop: 4, fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagTexto: { fontSize: 12, color: colors.textPrimary },
  tagTextoAtivo: { color: '#fff', fontWeight: '600' },
  salvarBotao: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  salvarBotaoDesabilitado: { opacity: 0.6 },
  salvarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
