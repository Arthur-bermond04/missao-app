import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { NivelInteresse } from '../types/database';

const CONFIG: Record<NivelInteresse, { emoji: string; label: string; cor: string }> = {
  quente: { emoji: '🔥', label: 'Quente', cor: colors.quente },
  morno: { emoji: '💧', label: 'Morno', cor: colors.morno },
  frio: { emoji: '❄️', label: 'Frio', cor: colors.frio },
};

export function BadgeInteresse({ nivel }: { nivel: NivelInteresse }) {
  const { emoji, label, cor } = CONFIG[nivel];
  return (
    <View style={[styles.badge, { backgroundColor: cor + '22' }]}>
      <Text style={[styles.texto, { color: cor }]}>
        {emoji} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  texto: {
    fontSize: 12,
    fontWeight: '600',
  },
});
