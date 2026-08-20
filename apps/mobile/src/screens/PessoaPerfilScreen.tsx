import React, { useCallback, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Trash2, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { BadgeInteresse } from '../components/BadgeInteresse';
import { buscarPessoa, criarInteracao, excluirInteracao, excluirPessoa, listarInteracoes } from '../lib/pessoas';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import { labelEtapaJornadaPessoa, useTerminologia } from '../lib/terminologia';
import { TIPOS_INTERACAO, type Pessoa, type PessoaInteracao, type Perfil, type TipoInteracao } from '../types/database';

export function PessoaPerfilScreen({ comunidadeId, perfil }: { comunidadeId: string; perfil: Perfil }) {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { pessoaId, usuarioId } = route.params as { pessoaId: string; nome: string; usuarioId: string };
  const terminologia = useTerminologia(comunidadeId);
  const isAdmin = perfil === 'admin';

  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [interacoes, setInteracoes] = useState<PessoaInteracao[]>([]);
  const [modal, setModal] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [confirmExcluirPessoa, setConfirmExcluirPessoa] = useState(false);
  const [interacaoParaExcluir, setInteracaoParaExcluir] = useState<PessoaInteracao | null>(null);

  const carregar = useCallback(() => {
    return Promise.all([buscarPessoa(pessoaId).then(setPessoa), listarInteracoes(pessoaId).then(setInteracoes)]);
  }, [pessoaId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function atualizar() {
    setAtualizando(true);
    carregar().finally(() => setAtualizando(false));
  }

  async function handleExcluirPessoa() {
    await excluirPessoa(pessoaId);
    toastSucesso('Pessoa excluída.');
    navigation.goBack();
  }

  async function handleExcluirInteracao() {
    if (!interacaoParaExcluir) return;
    await excluirInteracao(interacaoParaExcluir.id);
    setInteracaoParaExcluir(null);
    toastSucesso('Interação excluída.');
    carregar();
  }

  const etapaLabel = pessoa ? labelEtapaJornadaPessoa(pessoa.etapa_jornada, terminologia) : '';

  return (
    <View style={styles.container}>
      {pessoa && (
        <NovaInteracaoModal
          visivel={modal}
          onFechar={() => setModal(false)}
          pessoaId={pessoa.id}
          usuarioId={usuarioId}
          onSalvo={carregar}
        />
      )}
      <ConfirmModal
        visivel={confirmExcluirPessoa}
        onFechar={() => setConfirmExcluirPessoa(false)}
        onConfirmar={handleExcluirPessoa}
        titulo="Excluir permanentemente?"
        descricao={`Isso remove ${pessoa?.nome ?? 'esta pessoa'} e todo o histórico de interações para sempre. Esta ação não pode ser desfeita.`}
        labelConfirmar="Excluir"
      />
      <ConfirmModal
        visivel={!!interacaoParaExcluir}
        onFechar={() => setInteracaoParaExcluir(null)}
        onConfirmar={handleExcluirInteracao}
        titulo="Excluir esta interação?"
        descricao="Ação irreversível."
        labelConfirmar="Excluir"
      />

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={colors.primary} />}
      >
        {pessoa && (
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{pessoa.nome.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{pessoa.nome}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <View style={styles.badge}>
                  <Text style={styles.badgeTexto}>{etapaLabel}</Text>
                </View>
                <BadgeInteresse nivel={pessoa.nivel_interesse} />
              </View>
              {!!pessoa.telefone && <Text style={styles.meta}>{pessoa.telefone}</Text>}
              {!!pessoa.proxima_visita && (
                <Text style={styles.meta}>Próxima visita: {new Date(pessoa.proxima_visita).toLocaleDateString('pt-BR')}</Text>
              )}
            </View>
          </View>
        )}

        {isAdmin && (
          <Pressable onPress={() => setConfirmExcluirPessoa(true)} style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.danger }}>Excluir permanentemente</Text>
          </Pressable>
        )}

        {!!pessoa?.observacoes && (
          <View style={styles.observacoes}>
            <Text style={styles.observacoesTexto}>{pessoa.observacoes}</Text>
          </View>
        )}

        <Button label="+ Nova interação" onPress={() => setModal(true)} style={{ marginTop: 16 }} />

        <Text style={styles.secaoTitulo}>Histórico de interações</Text>
        {interacoes.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma interação registrada ainda.</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {interacoes.map((i) => {
              const tipoLabel = TIPOS_INTERACAO.find((t) => t.valor === i.tipo)?.label ?? i.tipo;
              return (
                <View key={i.id} style={styles.card}>
                  <View style={styles.cardTopo}>
                    <Text style={styles.itemNome}>{new Date(i.data).toLocaleDateString('pt-BR')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={styles.itemMeta}>{tipoLabel}</Text>
                      <Pressable onPress={() => setInteracaoParaExcluir(i)} hitSlop={8}>
                        <Trash2 size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.relato}>{i.descricao}</Text>
                  {!!i.proximo_passo && <Text style={styles.encaminhamentos}>→ {i.proximo_passo}</Text>}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NovaInteracaoModal({
  visivel,
  onFechar,
  pessoaId,
  usuarioId,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  pessoaId: string;
  usuarioId: string;
  onSalvo: () => void;
}) {
  const [data, setData] = useState(new Date());
  const [mostrarData, setMostrarData] = useState(false);
  const [tipo, setTipo] = useState<TipoInteracao>('contato');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (descricao.trim().length < 3) {
      toastErro('Escreva o que foi conversado.');
      return;
    }
    setSalvando(true);
    try {
      await criarInteracao({
        pessoa_id: pessoaId,
        usuario_id: usuarioId,
        data: data.toISOString().slice(0, 10),
        tipo,
        descricao: descricao.trim(),
      });
      setDescricao('');
      setTipo('contato');
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso('Interação registrada!');
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
            <Text style={styles.modalTitulo}>Nova interação</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }}>
            <Pressable style={styles.input} onPress={() => setMostrarData(true)}>
              <Text style={{ color: colors.textPrimary }}>{data.toLocaleDateString('pt-BR')}</Text>
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
              {TIPOS_INTERACAO.map((t) => (
                <Pressable key={t.valor} onPress={() => setTipo(t.valor)} style={[styles.chip, tipo === t.valor && styles.chipAtivo]}>
                  <Text style={[styles.chipTexto, tipo === t.valor && styles.chipTextoAtivo]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.campoLabel}>O que foi conversado</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              textAlignVertical="top"
              placeholder="Descreva a conversa/visita..."
              placeholderTextColor={colors.textSecondary}
            />
          </ScrollView>

          <Button label="Salvar" onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  conteudo: { padding: 20 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryXLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 18, fontWeight: '700', color: colors.primary },
  nome: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primaryXLight },
  badgeTexto: { fontSize: 12, fontWeight: '600', color: colors.primary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  observacoes: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, marginTop: 16 },
  observacoesTexto: { fontSize: 13, color: colors.textPrimary, lineHeight: 19 },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 24 },
  vazio: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  card: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemNome: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  itemMeta: { fontSize: 12, color: colors.textSecondary },
  relato: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  encaminhamentos: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
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
