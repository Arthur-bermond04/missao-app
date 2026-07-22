import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NivelInteresse } from '../types/database';

// Mesmas cores exatas do Badge.tsx web (quente/morno/frio)
const CONFIG: Record<NivelInteresse, { emoji: string; label: string; bg: string; texto: string }> = {
  quente: { emoji: '🔥', label: 'Quente', bg: '#FEF3C7', texto: '#D97706' },
  morno: { emoji: '💧', label: 'Morno', bg: '#DBEAFE', texto: '#1D4ED8' },
  frio: { emoji: '❄️', label: 'Frio', bg: '#F3F4F6', texto: '#6B7280' },
};

export function BadgeInteresse({ nivel }: { nivel: NivelInteresse }) {
  const { emoji, label, bg, texto } = CONFIG[nivel];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.texto, { color: texto }]}>
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
