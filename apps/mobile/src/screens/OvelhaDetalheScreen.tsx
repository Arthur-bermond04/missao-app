import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Lock, Sparkles, Trash2, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  arquivarOvelha,
  buscarOvelha,
  contarFrutosPorOvelha,
  criarEncontroPastoral,
  excluirEncontroPastoral,
  excluirFruto,
  excluirOvelha,
  listarEncontrosPastorais,
  listarFrutos,
  listarPresencasOvelha,
  registrarFruto,
  registrarPresenca,
} from '../lib/pastoral';
import { listarTiposEvento } from '../lib/tiposEvento';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import { useTerminologia } from '../lib/terminologia';
import {
  ESTADOS_ESPIRITUAL,
  ESTADOS_OVELHA_ENCONTRO,
  TIPOS_FRUTO_PASTORAL,
  type EstadoOvelhaEncontro,
  type PastoralEncontro,
  type PastoralFruto,
  type PastoralOvelha,
  type PastoralPresenca,
  type Perfil,
  type TipoEncontroPastoral,
  type TipoEventoComunidade,
  type TipoFrutoPastoral,
} from '../types/database';

const TIPOS: { valor: TipoEncontroPastoral; label: string }[] = [
  { valor: 'presencial', label: 'Presencial' },
  { valor: 'online', label: 'Online' },
  { valor: 'telefone', label: 'Telefone' },
  { valor: 'mensagem', label: 'Mensagem' },
];

const OUTRO = '__outro__';

export function OvelhaDetalheScreen({ comunidadeId, perfil }: { comunidadeId: string; perfil: Perfil }) {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { ovelhaId, pastorId } = route.params as { ovelhaId: string; nome: string; pastorId: string };
  const terminologia = useTerminologia(comunidadeId);
  const isAdmin = perfil === 'admin';

  const [ovelha, setOvelha] = useState<PastoralOvelha | null>(null);
  const [encontros, setEncontros] = useState<PastoralEncontro[]>([]);
  const [presencas, setPresencas] = useState<PastoralPresenca[]>([]);
  const [frutos, setFrutos] = useState<PastoralFruto[]>([]);
  const [modal, setModal] = useState(false);
  const [modalPresenca, setModalPresenca] = useState(false);
  const [modalFruto, setModalFruto] = useState(false);
  const [encontroParaExcluir, setEncontroParaExcluir] = useState<PastoralEncontro | null>(null);
  const [frutoParaExcluir, setFrutoParaExcluir] = useState<PastoralFruto | null>(null);
  const [confirmArquivar, setConfirmArquivar] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(() => {
    return Promise.all([
      buscarOvelha(ovelhaId).then(setOvelha),
      listarEncontrosPastorais(ovelhaId).then(setEncontros),
      listarPresencasOvelha(ovelhaId).then(setPresencas),
      listarFrutos(ovelhaId).then(setFrutos),
    ]);
  }, [ovelhaId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function atualizar() {
    setAtualizando(true);
    carregar().finally(() => setAtualizando(false));
  }

  async function handleArquivar() {
    await arquivarOvelha(ovelhaId);
    toastSucesso(`${terminologia.nome_ovelha} arquivada.`);
    navigation.goBack();
  }

  async function handleExcluirOvelha() {
    await excluirOvelha(ovelhaId);
    toastSucesso(`${terminologia.nome_ovelha} excluída.`);
    navigation.goBack();
  }

  async function handleExcluirEncontro() {
    if (!encontroParaExcluir) return;
    await excluirEncontroPastoral(encontroParaExcluir.id);
    setEncontroParaExcluir(null);
    toastSucesso('Encontro excluído.');
    carregar();
  }

  async function handleExcluirFruto() {
    if (!frutoParaExcluir) return;
    await excluirFruto(frutoParaExcluir.id);
    setFrutoParaExcluir(null);
    toastSucesso('Fruto excluído.');
    carregar();
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
      <PresencaModal
        visivel={modalPresenca}
        onFechar={() => setModalPresenca(false)}
        ovelhaId={ovelhaId}
        comunidadeId={comunidadeId}
        onSalvo={carregar}
      />
      <FrutoModal
        visivel={modalFruto}
        onFechar={() => setModalFruto(false)}
        ovelhaId={ovelhaId}
        pastorId={pastorId}
        onSalvo={carregar}
      />
      <ConfirmModal
        visivel={confirmArquivar}
        onFechar={() => setConfirmArquivar(false)}
        onConfirmar={handleArquivar}
        titulo={`Arquivar ${terminologia.nome_ovelha.toLowerCase()}?`}
        descricao={`${ovelha?.nome ?? 'Esta pessoa'} deixará de aparecer na lista de acompanhamento ativo. O histórico é mantido.`}
        labelConfirmar="Arquivar"
        variante="primary"
      />
      <ConfirmModal
        visivel={confirmExcluir}
        onFechar={() => setConfirmExcluir(false)}
        onConfirmar={handleExcluirOvelha}
        titulo="Excluir permanentemente?"
        descricao={`Isso remove ${ovelha?.nome ?? 'esta pessoa'} e todo o histórico de acompanhamento pastoral para sempre. Esta ação não pode ser desfeita.`}
        labelConfirmar="Excluir"
      />
      <ConfirmModal
        visivel={!!encontroParaExcluir}
        onFechar={() => setEncontroParaExcluir(null)}
        onConfirmar={handleExcluirEncontro}
        titulo="Excluir este encontro?"
        descricao="Ação irreversível."
        labelConfirmar="Excluir"
      />
      <ConfirmModal
        visivel={!!frutoParaExcluir}
        onFechar={() => setFrutoParaExcluir(null)}
        onConfirmar={handleExcluirFruto}
        titulo="Excluir este fruto?"
        descricao="Ação irreversível."
        labelConfirmar="Excluir"
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

        <View style={styles.acoesLinha}>
          <Pressable onPress={() => setConfirmArquivar(true)}>
            <Text style={styles.acaoTexto}>Arquivar</Text>
          </Pressable>
          {isAdmin && (
            <Pressable onPress={() => setConfirmExcluir(true)}>
              <Text style={[styles.acaoTexto, { color: colors.dangerText }]}>Excluir permanentemente</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.privacidade}>
          <Lock size={14} color={colors.primary} />
          <Text style={styles.privacidadeTexto}>Registros confidenciais — visíveis só por você e pelo admin.</Text>
        </View>

        <View style={styles.botoesTopo}>
          <Button label="+ Registrar encontro" onPress={() => setModal(true)} style={{ flex: 1 }} />
          <Button label="+ Presença" variant="secondary" onPress={() => setModalPresenca(true)} style={{ flex: 1 }} />
        </View>

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={styles.itemMeta}>
                        {est?.emoji} {e.tipo}
                      </Text>
                      <Pressable onPress={() => setEncontroParaExcluir(e)} hitSlop={8}>
                        <Trash2 size={14} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.relato}>{e.relato}</Text>
                  {!!e.encaminhamentos && <Text style={styles.encaminhamentos}>→ {e.encaminhamentos}</Text>}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.secaoTitulo}>Presenças em eventos</Text>
        {presencas.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma presença registrada ainda.</Text>
        ) : (
          <View style={{ gap: 8, marginTop: 8 }}>
            {presencas.slice(0, 10).map((p) => (
              <View key={p.id} style={styles.itemLinhaEntre}>
                <View>
                  <Text style={styles.itemNome}>{p.nome_evento || p.tipo_evento}</Text>
                  <Text style={styles.itemMeta}>{new Date(p.data).toLocaleDateString('pt-BR')}</Text>
                </View>
                <Text style={{ color: p.presente ? colors.accent : colors.dangerText, fontWeight: '700', fontSize: 12 }}>
                  {p.presente ? 'Presente' : 'Ausente'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.frutosTopo}>
          <Text style={styles.secaoTitulo}>Frutos</Text>
          <Pressable onPress={() => setModalFruto(true)}>
            <Text style={styles.acaoTexto}>+ Registrar fruto</Text>
          </Pressable>
        </View>
        {frutos.length === 0 ? (
          <Text style={styles.vazio}>Nenhum fruto registrado ainda.</Text>
        ) : (
          <View style={{ gap: 8, marginTop: 8 }}>
            {frutos.map((f) => {
              const cfg = TIPOS_FRUTO_PASTORAL.find((t) => t.valor === f.tipo);
              return (
                <View key={f.id} style={styles.card}>
                  <View style={styles.cardTopo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Sparkles size={14} color={colors.accent} />
                      <Text style={styles.itemNome}>{f.titulo}</Text>
                    </View>
                    <Pressable onPress={() => setFrutoParaExcluir(f)} hitSlop={8}>
                      <Trash2 size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={styles.itemMeta}>
                    {cfg?.label ?? f.tipo} · {new Date(f.data).toLocaleDateString('pt-BR')}
                  </Text>
                  {!!f.descricao && <Text style={styles.relato}>{f.descricao}</Text>}
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

// ---------------- Modal de presença em evento (missa, célula, etc.) ----------------
function PresencaModal({
  visivel,
  onFechar,
  ovelhaId,
  comunidadeId,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  ovelhaId: string;
  comunidadeId: string;
  onSalvo: () => void;
}) {
  const [tipos, setTipos] = useState<TipoEventoComunidade[]>([]);
  const [tipoEvento, setTipoEvento] = useState<string>('');
  const [nomeCustom, setNomeCustom] = useState('');
  const [data, setData] = useState(new Date());
  const [mostrarData, setMostrarData] = useState(false);
  const [presente, setPresente] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    listarTiposEvento(comunidadeId).then((lista) => {
      setTipos(lista);
      if (lista.length > 0) setTipoEvento(lista[0].nome);
    });
  }, [visivel, comunidadeId]);

  async function salvar() {
    const nomeFinal = tipoEvento === OUTRO ? nomeCustom.trim() : tipoEvento;
    if (!nomeFinal) {
      toastErro('Selecione ou informe o tipo de evento.');
      return;
    }
    setSalvando(true);
    try {
      await registrarPresenca({
        ovelha_id: ovelhaId,
        tipo_evento: tipoEvento === OUTRO ? 'outro' : tipoEvento,
        nome_evento: nomeFinal,
        data: data.toISOString().slice(0, 10),
        presente,
      });
      setNomeCustom('');
      setPresente(true);
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso('Presença registrada!');
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
            <Text style={styles.modalTitulo}>Registrar presença</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

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

          <Text style={styles.campoLabel}>Tipo de evento</Text>
          <View style={styles.chipsWrap}>
            {tipos.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTipoEvento(t.nome)}
                style={[styles.chip, tipoEvento === t.nome && styles.chipAtivo]}
              >
                <Text style={[styles.chipTexto, tipoEvento === t.nome && styles.chipTextoAtivo]}>{t.nome}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setTipoEvento(OUTRO)} style={[styles.chip, tipoEvento === OUTRO && styles.chipAtivo]}>
              <Text style={[styles.chipTexto, tipoEvento === OUTRO && styles.chipTextoAtivo]}>Outro</Text>
            </Pressable>
          </View>
          {tipoEvento === OUTRO && (
            <TextInput
              style={styles.input}
              value={nomeCustom}
              onChangeText={setNomeCustom}
              placeholder="Qual evento?"
              placeholderTextColor={colors.textMuted}
            />
          )}

          <Text style={styles.campoLabel}>Presença</Text>
          <View style={styles.chipsWrap}>
            <Pressable onPress={() => setPresente(true)} style={[styles.chip, presente && styles.chipAtivo]}>
              <Text style={[styles.chipTexto, presente && styles.chipTextoAtivo]}>Presente</Text>
            </Pressable>
            <Pressable onPress={() => setPresente(false)} style={[styles.chip, !presente && styles.chipAtivo]}>
              <Text style={[styles.chipTexto, !presente && styles.chipTextoAtivo]}>Ausente</Text>
            </Pressable>
          </View>

          <Button label="Salvar" onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

// ---------------- Modal de fruto pastoral ----------------
function FrutoModal({
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
  const [tipo, setTipo] = useState<TipoFrutoPastoral>('conquista');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo.trim()) {
      toastErro('Descreva o fruto em uma frase.');
      return;
    }
    setSalvando(true);
    try {
      await registrarFruto({
        ovelha_id: ovelhaId,
        pastor_id: pastorId,
        data: data.toISOString().slice(0, 10),
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
      });
      setTitulo('');
      setDescricao('');
      setTipo('conquista');
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso('Fruto registrado!');
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
            <Text style={styles.modalTitulo}>Registrar fruto</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

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
            {TIPOS_FRUTO_PASTORAL.map((t) => (
              <Pressable key={t.valor} onPress={() => setTipo(t.valor)} style={[styles.chip, tipo === t.valor && styles.chipAtivo]}>
                <Text style={[styles.chipTexto, tipo === t.valor && styles.chipTextoAtivo]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.campoLabel}>Título</Text>
          <TextInput
            style={styles.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex: Começou a frequentar a missa semanalmente"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.campoLabel}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
          />

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
  acoesLinha: { flexDirection: 'row', gap: 18, marginTop: 10 },
  acaoTexto: { fontSize: 13, fontWeight: '600', color: colors.primary },
  privacidade: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginTop: 12 },
  privacidadeTexto: { flex: 1, fontSize: 12, color: colors.primary },
  botoesTopo: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 24 },
  frutosTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  vazio: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemLinhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
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
