import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MessageCircle, ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { enviarMensagem, listarMensagens } from '../lib/mensagens';
import { listarTemplates } from '../lib/mensagensTemplates';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import type { Canal, MensagemEnviada, MensagemTemplate } from '../types/database';

const CANAIS: { valor: Canal; label: string }[] = [
  { valor: 'push', label: 'Push' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'email', label: 'E-mail' },
];

const DESTINATARIOS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'missionarios', label: 'Missionários' },
  { valor: 'lideres', label: 'Líderes' },
];

function ChipRow<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { valor: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {opcoes.map((o) => (
        <Pressable
          key={o.valor}
          onPress={() => onChange(o.valor)}
          style={[styles.chip, valor === o.valor && styles.chipAtivo]}
        >
          <Text style={[styles.chipTexto, valor === o.valor && styles.chipTextoAtivo]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function HistoricoCard({ mensagem }: { mensagem: MensagemEnviada }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Pressable style={styles.histItem} onPress={() => setAberto((v) => !v)}>
      <View style={styles.histTopo}>
        <View style={styles.histInfo}>
          <Text style={styles.histTitulo}>{mensagem.titulo || mensagem.corpo.slice(0, 40)}</Text>
          <Text style={styles.histMeta}>
            {mensagem.canal} · {mensagem.destinatarios} · {mensagem.total_enviados} destinatário(s)
          </Text>
        </View>
        {aberto ? (
          <ChevronUp size={18} color={colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={colors.textMuted} />
        )}
      </View>
      {aberto && <Text style={styles.histCorpo}>{mensagem.corpo}</Text>}
    </Pressable>
  );
}

export function MensagensScreen({
  comunidadeId,
  usuarioId,
}: {
  comunidadeId: string;
  usuarioId: string;
}) {
  const [historico, setHistorico] = useState<MensagemEnviada[]>([]);
  const [templates, setTemplates] = useState<MensagemTemplate[]>([]);
  const [canal, setCanal] = useState<Canal>('push');
  const [destinatarios, setDestinatarios] = useState('todos');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(() => {
    return Promise.all([
      listarMensagens(comunidadeId).then(setHistorico),
      listarTemplates(comunidadeId)
        .then(setTemplates)
        .catch(() => setTemplates([])),
    ]);
  }, [comunidadeId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function atualizar() {
    setAtualizando(true);
    carregar().finally(() => setAtualizando(false));
  }

  async function handleEnviar() {
    if (!corpo.trim()) {
      toastErro('Escreva a mensagem antes de enviar.');
      return;
    }
    setEnviando(true);
    try {
      const nova = await enviarMensagem({
        comunidade_id: comunidadeId,
        remetente_id: usuarioId,
        canal,
        destinatarios,
        titulo: titulo.trim() || undefined,
        corpo: corpo.trim(),
      });
      setHistorico((atual) => [nova, ...atual]);
      setTitulo('');
      setCorpo('');
      hapticoSucesso();
      toastSucesso('Mensagem registrada! (envio real depende das integrações)');
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao enviar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={colors.primary} />}
    >
      <Text style={styles.titulo}>Mensagens</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Nova mensagem</Text>

        <Text style={styles.campoLabel}>Canal</Text>
        <ChipRow opcoes={CANAIS} valor={canal} onChange={setCanal} />

        <Text style={styles.campoLabel}>Destinatários</Text>
        <ChipRow opcoes={DESTINATARIOS} valor={destinatarios} onChange={setDestinatarios} />

        {templates.length > 0 && (
          <>
            <Text style={styles.campoLabel}>Usar template</Text>
            <View style={styles.chips}>
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.templateChip}
                  onPress={() => {
                    setTitulo(t.titulo ?? '');
                    setCorpo(t.corpo);
                  }}
                >
                  <Text style={styles.templateChipTexto}>{t.nome}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.campoLabel}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Encontro de missionários"
          placeholderTextColor={colors.textMuted}
          value={titulo}
          onChangeText={setTitulo}
        />

        <Text style={styles.campoLabel}>Mensagem</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Escreva sua mensagem..."
          placeholderTextColor={colors.textMuted}
          value={corpo}
          onChangeText={setCorpo}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Button label="Enviar" icon={Send} onPress={handleEnviar} loading={enviando} style={styles.enviar} />
      </View>

      <Text style={styles.secaoTitulo}>Histórico</Text>
      {historico.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Nenhuma mensagem enviada ainda"
          description="Envie o primeiro aviso para sua equipe usando o formulário acima."
        />
      ) : (
        <View style={styles.histLista}>
          {historico.map((m) => (
            <HistoricoCard key={m.id} mensagem={m} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: '800', color: colors.text },
  card: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitulo: { fontSize: 15, fontWeight: '700', color: colors.text },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 14, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.text },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  templateChipTexto: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
  },
  textarea: { height: 110 },
  enviar: { marginTop: 18 },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 24 },
  histLista: { marginTop: 12, gap: 10 },
  histItem: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  histTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  histInfo: { flex: 1, marginRight: 8 },
  histTitulo: { fontSize: 14, fontWeight: '700', color: colors.text },
  histMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  histCorpo: { fontSize: 14, color: colors.text, marginTop: 10, lineHeight: 20 },
});
