import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Button } from './Button';

interface ConfirmModalProps {
  visivel: boolean;
  onFechar: () => void;
  onConfirmar: () => void | Promise<void>;
  titulo: string;
  descricao: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  variante?: 'danger' | 'primary';
}

// Modal de confirmação genérico — usado em toda ação destrutiva/sensível
// (excluir pessoa, ovelha, encontro, interação, lançamento, cargo).
export function ConfirmModal({
  visivel,
  onFechar,
  onConfirmar,
  titulo,
  descricao,
  labelConfirmar = 'Confirmar',
  labelCancelar = 'Cancelar',
  variante = 'danger',
}: ConfirmModalProps) {
  const [confirmando, setConfirmando] = useState(false);

  async function handleConfirmar() {
    setConfirmando(true);
    try {
      await onConfirmar();
      onFechar();
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.topo}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Pressable onPress={onFechar} disabled={confirmando}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.descricao}>{descricao}</Text>
          <View style={styles.acoes}>
            <Button label={labelCancelar} variant="secondary" onPress={onFechar} disabled={confirmando} style={styles.botao} />
            <Button
              label={labelConfirmar}
              variant={variante === 'danger' ? 'danger' : 'primary'}
              onPress={handleConfirmar}
              loading={confirmando}
              style={styles.botao}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  titulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  descricao: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 18 },
  botao: { flex: 1 },
});
