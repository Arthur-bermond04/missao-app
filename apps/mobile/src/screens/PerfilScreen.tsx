import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { KeyRound, Smartphone, LogOut, ChevronRight } from 'lucide-react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui/Button';
import { colors } from '../theme/colors';
import { buscarComunidade } from '../lib/comunidades';
import { redefinirDispositivo } from '../lib/usuarios';
import { toastSucesso, toastErro } from '../lib/toast';
import { hapticoSucesso, hapticoErro } from '../lib/haptics';
import type { Perfil, Usuario } from '../types/database';

const PERFIL_LABEL: Record<Perfil, string> = {
  missionario: 'Missionário',
  lider: 'Líder',
  coordenador: 'Coordenador',
  padre: 'Padre',
  admin: 'Admin',
};

export function PerfilScreen({ usuario, onSair }: { usuario: Usuario; onSair: () => Promise<void> }) {
  const navigation = useNavigation<any>();
  const [nomeComunidade, setNomeComunidade] = useState('');
  const [dispositivoId, setDispositivoId] = useState<string | null>(usuario.dispositivo_id);
  const [redefinindo, setRedefinindo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (usuario.comunidade_id) {
        buscarComunidade(usuario.comunidade_id).then((c) => setNomeComunidade(c?.nome ?? ''));
      }
    }, [usuario.comunidade_id])
  );

  async function handleRedefinir() {
    setRedefinindo(true);
    try {
      await redefinirDispositivo(usuario.id);
      setDispositivoId(null);
      hapticoSucesso();
      toastSucesso('Dispositivo redefinido.');
    } catch (e: any) {
      hapticoErro();
      toastErro(e?.message ?? 'Erro ao redefinir dispositivo.');
    } finally {
      setRedefinindo(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <View style={styles.topo}>
        <Avatar nome={usuario.nome} size={72} />
        <Text style={styles.nome}>{usuario.nome}</Text>
        <Text style={styles.perfil}>{PERFIL_LABEL[usuario.perfil]}</Text>
        {!!nomeComunidade && <Text style={styles.comunidade}>{nomeComunidade}</Text>}
      </View>

      <Text style={styles.secaoTitulo}>Conta</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('AlterarSenha')}>
          <View style={styles.itemEsquerda}>
            <KeyRound size={18} color={colors.primary} />
            <Text style={styles.itemLabel}>Alterar senha</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.separador} />

        <View style={styles.itemColuna}>
          <View style={styles.itemEsquerda}>
            <Smartphone size={18} color={colors.primary} />
            <Text style={styles.itemLabel}>Dispositivo conectado</Text>
          </View>
          {dispositivoId ? (
            <>
              <Text style={styles.dispositivoId}>{dispositivoId}</Text>
              <Text style={styles.dispositivoAcesso}>
                Último acesso:{' '}
                {usuario.ultimo_acesso
                  ? new Date(usuario.ultimo_acesso).toLocaleString('pt-BR')
                  : 'desconhecido'}
              </Text>
              <Button
                label="Redefinir"
                variant="secondary"
                loading={redefinindo}
                onPress={handleRedefinir}
                style={styles.redefinir}
              />
            </>
          ) : (
            <Text style={styles.dispositivoAcesso}>Nenhum dispositivo registrado.</Text>
          )}
        </View>
      </View>

      <Button label="Sair" variant="danger" icon={LogOut} onPress={onSair} style={styles.sair} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  conteudo: { padding: 20, paddingBottom: 40 },
  topo: { alignItems: 'center', paddingVertical: 12 },
  nome: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 12 },
  perfil: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 2 },
  comunidade: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  secaoTitulo: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  itemColuna: { paddingVertical: 16 },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemLabel: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  separador: { height: 1, backgroundColor: colors.border },
  dispositivoId: { fontSize: 13, color: colors.textPrimary, marginTop: 10 },
  dispositivoAcesso: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  redefinir: { marginTop: 12, alignSelf: 'flex-start' },
  sair: { marginTop: 24 },
});
