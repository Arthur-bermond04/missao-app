import React, { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { IdCard, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { BadgeInteresse } from '../components/BadgeInteresse';
import { criarPessoa, listarPessoas, proximoContatoVencido } from '../lib/pessoas';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import { labelEtapaJornadaPessoa, useTerminologia } from '../lib/terminologia';
import { ORIGENS_PESSOA, type OrigemPessoa, type Pessoa } from '../types/database';

const ORIGEM_OUTRO = 'outro';

export function PessoasScreen({ comunidadeId, usuarioId }: { comunidadeId: string; usuarioId: string }) {
  const navigation = useNavigation<any>();
  const terminologia = useTerminologia(comunidadeId);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNova, setModalNova] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarPessoas(comunidadeId)
      .then(setPessoas)
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  useFocusEffect(useCallback(() => carregar(), [carregar]));

  return (
    <View style={styles.container}>
      <NovaPessoaModal
        visivel={modalNova}
        onFechar={() => setModalNova(false)}
        comunidadeId={comunidadeId}
        cadastradoPor={usuarioId}
        onSalvo={carregar}
      />

      <FlatList
        data={pessoas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListEmptyComponent={
          !carregando ? (
            <EmptyState
              icon={IdCard}
              title="Nenhuma pessoa cadastrada ainda"
              description="Cadastre as pessoas que você acompanha na missão."
              actionLabel="+ Nova pessoa"
              onAction={() => setModalNova(true)}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const vencido = proximoContatoVencido(item);
          const etapaLabel = labelEtapaJornadaPessoa(item.etapa_jornada, terminologia);
          return (
            <Pressable
              style={[styles.card, vencido && styles.cardCritico]}
              onPress={() => navigation.navigate('PessoaPerfil', { pessoaId: item.id, nome: item.nome, usuarioId })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>{item.nome.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.meta}>
                  {vencido
                    ? 'Contato vencido'
                    : item.proxima_visita
                    ? `Próxima visita: ${new Date(item.proxima_visita).toLocaleDateString('pt-BR')}`
                    : etapaLabel}
                </Text>
              </View>
              <BadgeInteresse nivel={item.nivel_interesse} />
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

function NovaPessoaModal({
  visivel,
  onFechar,
  comunidadeId,
  cadastradoPor,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  comunidadeId: string;
  cadastradoPor: string;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [origem, setOrigem] = useState<OrigemPessoa>('evangelizacao');
  const [origemDescricao, setOrigemDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) {
      toastErro('Informe o nome.');
      return;
    }
    if (origem === ORIGEM_OUTRO && !origemDescricao.trim()) {
      toastErro('Conte qual foi a origem.');
      return;
    }
    setSalvando(true);
    try {
      await criarPessoa({
        comunidade_id: comunidadeId,
        cadastrado_por: cadastradoPor,
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        origem,
        origem_descricao: origem === ORIGEM_OUTRO ? origemDescricao.trim() : undefined,
      });
      setNome('');
      setTelefone('');
      setOrigem('evangelizacao');
      setOrigemDescricao('');
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso('Pessoa cadastrada!');
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao cadastrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>Nova pessoa</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="Telefone (opcional)" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />

            <Text style={styles.campoLabel}>Origem</Text>
            <View style={styles.chipsWrap}>
              {ORIGENS_PESSOA.map((o) => (
                <Pressable key={o.valor} onPress={() => setOrigem(o.valor)} style={[styles.chip, origem === o.valor && styles.chipAtivo]}>
                  <Text style={[styles.chipTexto, origem === o.valor && styles.chipTextoAtivo]}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
            {origem === ORIGEM_OUTRO && (
              <TextInput
                style={styles.input}
                value={origemDescricao}
                onChangeText={setOrigemDescricao}
                placeholder="Qual a origem?"
                placeholderTextColor={colors.textSecondary}
              />
            )}
          </ScrollView>
          <Button label="Cadastrar" onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  lista: { padding: 20, gap: 10, paddingBottom: 90 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  cardCritico: { borderColor: colors.danger, borderWidth: 1.5 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 13, fontWeight: '700', color: colors.primary },
  info: { flex: 1 },
  nome: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: 'rgba(34,197,94,0.4)', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTexto: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.bgCard, borderRadius: 18, padding: 20 },
  modalTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  input: { backgroundColor: colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 15, marginTop: 8 },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 6 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.textPrimary },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
});
