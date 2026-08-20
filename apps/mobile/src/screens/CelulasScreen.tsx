import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Users2, Clock, MapPin, UserRound, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { supabase } from '../lib/supabase';
import {
  atualizarCelula,
  criarCelula,
  desativarCelula,
  listarCelulas,
  listarMembrosDaCelula,
  reativarCelula,
  DIAS_SEMANA,
  DIA_LABEL,
  type CelulaComInfo,
  type MembroCelula,
} from '../lib/celulas';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import type { Perfil, Usuario } from '../types/database';

const PERFIS_GESTAO: Perfil[] = ['lider', 'coordenador', 'admin'];

export function CelulasScreen({ comunidadeId, perfil }: { comunidadeId: string; perfil: Perfil }) {
  const podeGerir = PERFIS_GESTAO.includes(perfil);
  const [celulas, setCelulas] = useState<CelulaComInfo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'ativas' | 'inativas' | 'todas'>('ativas');
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState<CelulaComInfo | null>(null);
  const [detalhe, setDetalhe] = useState<CelulaComInfo | null>(null);
  const [paraDesativar, setParaDesativar] = useState<CelulaComInfo | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarCelulas(comunidadeId)
      .then(setCelulas)
      .finally(() => setCarregando(false));
  }, [comunidadeId]);

  useFocusEffect(useCallback(() => {
    carregar();
    supabase
      .from('usuarios')
      .select('*')
      .eq('comunidade_id', comunidadeId)
      .order('nome', { ascending: true })
      .then(({ data }) => setUsuarios((data as Usuario[]) ?? []));
  }, [carregar, comunidadeId]));

  const filtradas = useMemo(() => {
    return celulas.filter((c) => {
      if (filtro === 'ativas' && !c.ativa) return false;
      if (filtro === 'inativas' && c.ativa) return false;
      if (busca) {
        const t = busca.toLowerCase();
        if (!c.nome.toLowerCase().includes(t) && !(c.lider_nome ?? '').toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [celulas, filtro, busca]);

  async function handleDesativar() {
    if (!paraDesativar) return;
    await desativarCelula(paraDesativar.id);
    toastSucesso('Célula desativada.');
    setParaDesativar(null);
    setDetalhe(null);
    carregar();
  }

  async function handleReativar(c: CelulaComInfo) {
    await reativarCelula(c.id);
    toastSucesso('Célula reativada.');
    setDetalhe(null);
    carregar();
  }

  return (
    <View style={styles.container}>
      {modalForm && (
        <CelulaFormModal
          comunidadeId={comunidadeId}
          usuarios={usuarios}
          celula={editando}
          onFechar={() => {
            setModalForm(false);
            setEditando(null);
          }}
          onSalvo={() => {
            setModalForm(false);
            setEditando(null);
            carregar();
          }}
        />
      )}
      {detalhe && (
        <DetalheModal
          celula={detalhe}
          podeGerir={podeGerir}
          onFechar={() => setDetalhe(null)}
          onEditar={() => {
            setEditando(detalhe);
            setDetalhe(null);
            setModalForm(true);
          }}
          onDesativar={() => setParaDesativar(detalhe)}
          onReativar={() => handleReativar(detalhe)}
        />
      )}
      <ConfirmModal
        visivel={!!paraDesativar}
        onFechar={() => setParaDesativar(null)}
        onConfirmar={handleDesativar}
        titulo="Desativar célula?"
        descricao={`${paraDesativar?.nome ?? 'Esta célula'} sai da lista de ativas. O histórico é mantido.`}
        labelConfirmar="Desativar"
        variante="primary"
      />

      <View style={styles.filtros}>
        <TextInput
          style={styles.busca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou líder"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.segmento}>
          {(['ativas', 'inativas', 'todas'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFiltro(f)} style={[styles.segItem, filtro === f && styles.segAtivo]}>
              <Text style={[styles.segTexto, filtro === f && styles.segTextoAtivo]}>
                {f === 'ativas' ? 'Ativas' : f === 'inativas' ? 'Inativas' : 'Todas'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        refreshing={carregando}
        onRefresh={carregar}
        ListEmptyComponent={
          !carregando ? (
            <EmptyState
              icon={Users2}
              title="Nenhuma célula"
              description="Cadastre as células (pequenos grupos) da comunidade."
              actionLabel={podeGerir ? '+ Nova célula' : undefined}
              onAction={podeGerir ? () => setModalForm(true) : undefined}
            />
          ) : null
        }
        renderItem={({ item: c }) => (
          <Pressable style={[styles.card, !c.ativa && { opacity: 0.6 }]} onPress={() => setDetalhe(c)}>
            <View style={styles.cardTopo}>
              <Text style={styles.cardNome}>{c.nome}</Text>
              <View style={[styles.statusPill, { backgroundColor: c.ativa ? colors.primaryXLight : colors.bgPage }]}>
                <Text style={[styles.statusTexto, { color: c.ativa ? colors.primary : colors.textSecondary }]}>
                  {c.ativa ? 'Ativa' : 'Inativa'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>
              <UserRound size={11} color={colors.textSecondary} /> {c.lider_nome ?? 'Sem líder'}
            </Text>
            <Text style={styles.cardMeta}>
              {c.dia_semana ? DIA_LABEL[c.dia_semana] ?? c.dia_semana : 'Dia não definido'}
              {c.horario ? ` · ${c.horario}` : ''} · {c.total_membros} membro(s)
            </Text>
          </Pressable>
        )}
      />

      {podeGerir && (
        <Pressable style={styles.fab} onPress={() => setModalForm(true)}>
          <Text style={styles.fabTexto}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

function CelulaFormModal({
  comunidadeId,
  usuarios,
  celula,
  onFechar,
  onSalvo,
}: {
  comunidadeId: string;
  usuarios: Usuario[];
  celula: CelulaComInfo | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editando = !!celula;
  const [nome, setNome] = useState(celula?.nome ?? '');
  const [liderId, setLiderId] = useState(celula?.lider_id ?? '');
  const [buscaLider, setBuscaLider] = useState('');
  const [dia, setDia] = useState(celula?.dia_semana ?? '');
  const [horario, setHorario] = useState(celula?.horario ?? '');
  const [endereco, setEndereco] = useState(celula?.endereco ?? '');
  const [salvando, setSalvando] = useState(false);

  const liderNome = usuarios.find((u) => u.id === liderId)?.nome ?? '';
  const resultados = useMemo(() => {
    const t = buscaLider.trim().toLowerCase();
    if (!t) return [];
    return usuarios.filter((u) => u.nome.toLowerCase().includes(t)).slice(0, 8);
  }, [buscaLider, usuarios]);

  async function salvar() {
    if (!nome.trim()) {
      toastErro('Informe o nome da célula.');
      return;
    }
    setSalvando(true);
    try {
      if (editando && celula) {
        await atualizarCelula(celula.id, {
          nome: nome.trim(),
          lider_id: liderId || null,
          dia_semana: dia || null,
          horario: horario || null,
          endereco: endereco.trim() || null,
        });
        toastSucesso('Célula atualizada!');
      } else {
        await criarCelula({
          comunidade_id: comunidadeId,
          nome: nome.trim(),
          lider_id: liderId || undefined,
          dia_semana: dia || undefined,
          horario: horario || undefined,
          endereco: endereco.trim() || undefined,
        });
        toastSucesso('Célula criada!');
      }
      hapticoSucesso();
      onSalvo();
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>{editando ? 'Editar célula' : 'Nova célula'}</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 440 }}>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome da célula" placeholderTextColor={colors.textSecondary} />

            <Text style={styles.campoLabel}>Líder</Text>
            {liderId ? (
              <Pressable style={styles.selecionado} onPress={() => { setLiderId(''); setBuscaLider(''); }}>
                <Text style={styles.selecionadoTexto}>{liderNome}</Text>
                <Text style={styles.trocar}>trocar</Text>
              </Pressable>
            ) : (
              <>
                <TextInput style={styles.input} value={buscaLider} onChangeText={setBuscaLider} placeholder="Buscar membro..." placeholderTextColor={colors.textSecondary} />
                {resultados.map((u) => (
                  <Pressable key={u.id} style={styles.resultado} onPress={() => { setLiderId(u.id); setBuscaLider(''); }}>
                    <Text style={styles.cardNome}>{u.nome}</Text>
                  </Pressable>
                ))}
              </>
            )}

            <Text style={styles.campoLabel}>Dia da semana</Text>
            <View style={styles.chipsWrap}>
              {DIAS_SEMANA.map((d) => (
                <Pressable key={d.valor} onPress={() => setDia(dia === d.valor ? '' : d.valor)} style={[styles.chip, dia === d.valor && styles.chipAtivo]}>
                  <Text style={[styles.chipTexto, dia === d.valor && styles.chipTextoAtivo]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput style={styles.input} value={horario} onChangeText={setHorario} placeholder="Horário (ex: 20:00)" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={endereco} onChangeText={setEndereco} placeholder="Endereço" placeholderTextColor={colors.textSecondary} />
          </ScrollView>
          <Button label={editando ? 'Salvar' : 'Criar célula'} onPress={salvar} loading={salvando} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

function DetalheModal({
  celula,
  podeGerir,
  onFechar,
  onEditar,
  onDesativar,
  onReativar,
}: {
  celula: CelulaComInfo;
  podeGerir: boolean;
  onFechar: () => void;
  onEditar: () => void;
  onDesativar: () => void;
  onReativar: () => void;
}) {
  const [membros, setMembros] = useState<MembroCelula[]>([]);
  React.useEffect(() => {
    listarMembrosDaCelula(celula.id).then(setMembros).catch(() => setMembros([]));
  }, [celula.id]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopo}>
            <Text style={styles.modalTitulo}>{celula.nome}</Text>
            <Pressable onPress={onFechar}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            <View style={styles.detLinha}><UserRound size={14} color={colors.primary} /><Text style={styles.detTexto}>{celula.lider_nome ?? 'Sem líder'}</Text></View>
            <View style={styles.detLinha}><Clock size={14} color={colors.primary} /><Text style={styles.detTexto}>{celula.dia_semana ? DIA_LABEL[celula.dia_semana] ?? celula.dia_semana : '—'}{celula.horario ? ` · ${celula.horario}` : ''}</Text></View>
            <View style={styles.detLinha}><MapPin size={14} color={colors.primary} /><Text style={styles.detTexto}>{celula.endereco ?? '—'}</Text></View>

            <Text style={styles.campoLabel}>Membros vinculados ({membros.length})</Text>
            {membros.length === 0 ? (
              <Text style={styles.vazio}>Ninguém vinculado ainda. Atribua uma célula ao cargo de alguém em Equipe.</Text>
            ) : (
              membros.map((m) => (
                <View key={m.id} style={styles.membroLinha}>
                  <Text style={styles.cardNome}>{m.nome}</Text>
                  <Text style={styles.cardMeta}>{m.cargo}</Text>
                </View>
              ))
            )}
          </ScrollView>
          {podeGerir && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button label="Editar" variant="secondary" onPress={onEditar} style={{ flex: 1 }} />
              {celula.ativa ? (
                <Button label="Desativar" variant="danger" onPress={onDesativar} style={{ flex: 1 }} />
              ) : (
                <Button label="Reativar" variant="success" onPress={onReativar} style={{ flex: 1 }} />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  filtros: { padding: 16, gap: 10, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  busca: { backgroundColor: colors.bgPage, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontSize: 14 },
  segmento: { flexDirection: 'row', gap: 8 },
  segItem: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  segAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  segTexto: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  segTextoAtivo: { color: '#fff' },
  lista: { padding: 16, gap: 10, paddingBottom: 90 },
  card: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
  cardTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardNome: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusTexto: { fontSize: 10, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabTexto: { color: '#fff', fontSize: 28, lineHeight: 30 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
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
  selecionado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primaryXLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  selecionadoTexto: { fontSize: 14, fontWeight: '600', color: colors.primary },
  trocar: { fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  resultado: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  detLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  detTexto: { fontSize: 14, color: colors.textPrimary },
  membroLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6 },
  vazio: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
});
