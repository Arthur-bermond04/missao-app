import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Crown, GraduationCap, Network, Trash2, User, Wrench, X, XCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { criarCargo, encerrarCargo, excluirCargo, listarEquipeCargos, type EquipeCargoComVinculo } from '../lib/equipe';
import { listarPessoas } from '../lib/pessoas';
import { supabase } from '../lib/supabase';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import {
  CARGOS_EQUIPE_SUGERIDOS,
  NIVEIS_EQUIPE,
  type Celula,
  type NivelEquipe,
  type Pessoa,
  type Perfil,
  type Usuario,
} from '../types/database';

const CARGO_OUTRO = '__outro__';

const NIVEL_ICONE: Record<NivelEquipe, typeof Crown> = {
  lideranca: Crown,
  formacao: GraduationCap,
  servico: Wrench,
  membro: User,
};

const NIVEL_COR: Record<NivelEquipe, string> = {
  lideranca: colors.primary,
  formacao: colors.accent,
  servico: colors.amber,
  membro: colors.textMuted,
};

export function EquipeScreen({ comunidadeId, perfil }: { comunidadeId: string; perfil: Perfil }) {
  const isAdmin = perfil === 'admin';
  const [cargos, setCargos] = useState<EquipeCargoComVinculo[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [paraEncerrar, setParaEncerrar] = useState<EquipeCargoComVinculo | null>(null);
  const [paraExcluir, setParaExcluir] = useState<EquipeCargoComVinculo | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarEquipeCargos(comunidadeId)
      .then(setCargos)
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  useFocusEffect(
    useCallback(() => {
      listarPessoas(comunidadeId).then(setPessoas);
      supabase
        .from('usuarios')
        .select('*')
        .eq('comunidade_id', comunidadeId)
        .order('nome', { ascending: true })
        .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
      supabase
        .from('celulas')
        .select('*')
        .eq('comunidade_id', comunidadeId)
        .eq('ativa', true)
        .order('nome', { ascending: true })
        .then(({ data }) => setCelulas((data as Celula[]) ?? []));
    }, [comunidadeId])
  );

  const ativos = useMemo(() => cargos.filter((c) => c.ativo), [cargos]);

  const cargosPorNivel = useMemo(() => {
    const mapa = new Map<NivelEquipe, EquipeCargoComVinculo[]>();
    for (const n of NIVEIS_EQUIPE) mapa.set(n.valor, []);
    for (const c of ativos) mapa.get(c.nivel)?.push(c);
    return mapa;
  }, [ativos]);

  const secoes = NIVEIS_EQUIPE.map((n) => ({ nivel: n, lista: cargosPorNivel.get(n.valor) ?? [] })).filter(
    (s) => s.lista.length > 0
  );

  async function handleEncerrar() {
    if (!paraEncerrar) return;
    await encerrarCargo(paraEncerrar.id);
    setParaEncerrar(null);
    toastSucesso('Cargo encerrado.');
    carregar();
  }

  async function handleExcluir() {
    if (!paraExcluir) return;
    await excluirCargo(paraExcluir.id);
    setParaExcluir(null);
    toastSucesso('Cargo excluído.');
    carregar();
  }

  return (
    <View style={styles.container}>
      <NovoCargoModal
        visivel={modalNovo}
        onFechar={() => setModalNovo(false)}
        comunidadeId={comunidadeId}
        pessoas={pessoas}
        usuarios={usuarios}
        celulas={celulas}
        onSalvo={carregar}
      />
      <ConfirmModal
        visivel={!!paraEncerrar}
        onFechar={() => setParaEncerrar(null)}
        onConfirmar={handleEncerrar}
        titulo="Encerrar este cargo?"
        descricao={`${paraEncerrar?.pessoa_nome ?? paraEncerrar?.usuario_nome ?? 'Esta pessoa'} deixará de aparecer como ativo(a) em ${paraEncerrar?.cargo}. O histórico é mantido.`}
        labelConfirmar="Encerrar"
        variante="primary"
      />
      <ConfirmModal
        visivel={!!paraExcluir}
        onFechar={() => setParaExcluir(null)}
        onConfirmar={handleExcluir}
        titulo="Excluir permanentemente?"
        descricao={`Isso remove o registro de ${paraExcluir?.cargo} de ${paraExcluir?.pessoa_nome ?? paraExcluir?.usuario_nome ?? 'esta pessoa'} para sempre.`}
        labelConfirmar="Excluir"
      />

      <FlatList
        data={secoes}
        keyExtractor={(s) => s.nivel.valor}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListEmptyComponent={
          !carregando ? (
            <EmptyState
              icon={Network}
              title="Nenhum cargo cadastrado"
              description="Organize a estrutura da comunidade — quem faz o quê, em qual nível."
              actionLabel="+ Adicionar cargo"
              onAction={() => setModalNovo(true)}
            />
          ) : null
        }
        renderItem={({ item: secao }) => {
          const Icone = NIVEL_ICONE[secao.nivel.valor];
          const cor = NIVEL_COR[secao.nivel.valor];
          return (
            <View style={styles.secao}>
              <View style={styles.secaoTopo}>
                <Icone size={15} color={cor} />
                <Text style={styles.secaoTitulo}>{secao.nivel.label}</Text>
                <Text style={styles.secaoContagem}>({secao.lista.length})</Text>
              </View>
              <View style={{ gap: 8, marginTop: 8 }}>
                {secao.lista.map((c) => (
                  <View key={c.id} style={styles.card}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarTexto}>{(c.pessoa_nome ?? c.usuario_nome ?? '??').slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemNome}>{c.pessoa_nome ?? c.usuario_nome}</Text>
                      <Text style={styles.itemMeta}>
                        {c.cargo}
                        {c.celula_nome ? ` · ${c.celula_nome}` : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => setParaEncerrar(c)} hitSlop={8} style={{ marginRight: 12 }}>
                      <XCircle size={16} color={colors.textMuted} />
                    </Pressable>
                    {isAdmin && (
                      <Pressable onPress={() => setParaExcluir(c)} hitSlop={8}>
                        <Trash2 size={16} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setModalNovo(true)}>
        <Text style={styles.fabTexto}>+</Text>
      </Pressable>
    </View>
  );
}

function NovoCargoModal({
  visivel,
  onFechar,
  comunidadeId,
  pessoas,
  usuarios,
  celulas,
  onSalvo,
}: {
  visivel: boolean;
  onFechar: () => void;
  comunidadeId: string;
  pessoas: Pessoa[];
  usuarios: Usuario[];
  celulas: Celula[];
  onSalvo: () => void;
}) {
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<{ tipo: 'pessoa' | 'usuario'; id: string; nome: string } | null>(null);
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [cargoCustom, setCargoCustom] = useState('');
  const [nivel, setNivel] = useState<NivelEquipe>('membro');
  const [celulaId, setCelulaId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    const dePessoas = pessoas
      .filter((p) => p.nome.toLowerCase().includes(termo))
      .map((p) => ({ tipo: 'pessoa' as const, id: p.id, nome: p.nome, sub: p.telefone ?? '' }));
    const deUsuarios = usuarios
      .filter((u) => u.nome.toLowerCase().includes(termo))
      .map((u) => ({ tipo: 'usuario' as const, id: u.id, nome: u.nome, sub: 'Membro do app' }));
    return [...dePessoas, ...deUsuarios].slice(0, 15);
  }, [busca, pessoas, usuarios]);

  function limpar() {
    setBusca('');
    setSelecionado(null);
    setCargoSelecionado('');
    setCargoCustom('');
    setNivel('membro');
    setCelulaId(null);
  }

  async function salvar() {
    if (!selecionado) {
      toastErro('Selecione uma pessoa ou um membro do app.');
      return;
    }
    const cargoFinal = cargoSelecionado === CARGO_OUTRO ? cargoCustom.trim() : cargoSelecionado;
    if (!cargoFinal) {
      toastErro('Informe o cargo.');
      return;
    }
    setSalvando(true);
    try {
      await criarCargo({
        comunidade_id: comunidadeId,
        pessoa_id: selecionado.tipo === 'pessoa' ? selecionado.id : undefined,
        usuario_id: selecionado.tipo === 'usuario' ? selecionado.id : undefined,
        cargo: cargoFinal,
        cargo_descricao: cargoSelecionado === CARGO_OUTRO ? cargoCustom.trim() : undefined,
        nivel,
        celula_id: celulaId ?? undefined,
      });
      limpar();
      onSalvo();
      onFechar();
      hapticoSucesso();
      toastSucesso('Cargo adicionado!');
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao adicionar cargo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>Adicionar cargo</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 440 }}>
            <Text style={styles.campoLabel}>Pessoa ou membro</Text>
            {selecionado ? (
              <Pressable style={styles.selecionadoBox} onPress={() => setSelecionado(null)}>
                <Text style={styles.selecionadoTexto}>{selecionado.nome}</Text>
                <Text style={styles.trocarTexto}>trocar</Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={busca}
                  onChangeText={setBusca}
                  placeholder="Buscar por nome..."
                  placeholderTextColor={colors.textMuted}
                />
                {resultados.map((r) => (
                  <Pressable
                    key={`${r.tipo}-${r.id}`}
                    style={styles.resultadoItem}
                    onPress={() => {
                      setSelecionado({ tipo: r.tipo, id: r.id, nome: r.nome });
                      setBusca('');
                    }}
                  >
                    <Text style={styles.itemNome}>{r.nome}</Text>
                    {!!r.sub && <Text style={styles.itemMeta}>{r.sub}</Text>}
                  </Pressable>
                ))}
              </>
            )}

            <Text style={styles.campoLabel}>Cargo</Text>
            <View style={styles.chipsWrap}>
              {CARGOS_EQUIPE_SUGERIDOS.map((c) => (
                <Pressable key={c} onPress={() => setCargoSelecionado(c)} style={[styles.chip, cargoSelecionado === c && styles.chipAtivo]}>
                  <Text style={[styles.chipTexto, cargoSelecionado === c && styles.chipTextoAtivo]}>{c}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setCargoSelecionado(CARGO_OUTRO)} style={[styles.chip, cargoSelecionado === CARGO_OUTRO && styles.chipAtivo]}>
                <Text style={[styles.chipTexto, cargoSelecionado === CARGO_OUTRO && styles.chipTextoAtivo]}>Outro</Text>
              </Pressable>
            </View>
            {cargoSelecionado === CARGO_OUTRO && (
              <TextInput
                style={styles.input}
                value={cargoCustom}
                onChangeText={setCargoCustom}
                placeholder="Qual cargo?"
                placeholderTextColor={colors.textMuted}
              />
            )}

            <Text style={styles.campoLabel}>Nível</Text>
            <View style={styles.chipsWrap}>
              {NIVEIS_EQUIPE.map((n) => (
                <Pressable key={n.valor} onPress={() => setNivel(n.valor)} style={[styles.chip, nivel === n.valor && styles.chipAtivo]}>
                  <Text style={[styles.chipTexto, nivel === n.valor && styles.chipTextoAtivo]}>{n.label}</Text>
                </Pressable>
              ))}
            </View>

            {celulas.length > 0 && (
              <>
                <Text style={styles.campoLabel}>Célula (opcional)</Text>
                <View style={styles.chipsWrap}>
                  {celulas.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => setCelulaId(celulaId === c.id ? null : c.id)}
                      style={[styles.chip, celulaId === c.id && styles.chipAtivo]}
                    >
                      <Text style={[styles.chipTexto, celulaId === c.id && styles.chipTextoAtivo]}>{c.nome}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <Button label="Adicionar" onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lista: { padding: 20, paddingBottom: 90, gap: 16 },
  secao: {},
  secaoTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secaoTitulo: { fontSize: 14, fontWeight: '700', color: colors.text },
  secaoContagem: { fontSize: 12, color: colors.textMuted },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemNome: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: 'rgba(34,197,94,0.4)', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTexto: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  modalTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  campoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15, marginTop: 8 },
  resultadoItem: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  selecionadoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  selecionadoTexto: { fontSize: 14, fontWeight: '600', color: colors.primary },
  trocarTexto: { fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.text },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
});
