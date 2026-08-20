import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconeCirculo}>
        <Icon size={30} color={colors.primary} />
      </View>
      <Text style={styles.titulo}>{title}</Text>
      {!!description && <Text style={styles.descricao}>{description}</Text>}
      {!!actionLabel && !!onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.botao} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  iconeCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryXLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  descricao: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  botao: { marginTop: 16 },
});
