import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NivelInteresse } from '../types/database';

// Mesmas cores exatas do Badge.tsx web (quente/morno/frio)
const CONFIG: Record<NivelInteresse, { emoji: string; label: string; bg: string; texto: string }> = {
  quente: { emoji: '🔥', label: 'Quente', bg: '#FBF3E0', texto: '#8B6A2A' },
  morno: { emoji: '💧', label: 'Morno', bg: '#E1F5EE', texto: '#085041' },
  frio: { emoji: '❄️', label: 'Frio', bg: '#F7F4EE', texto: '#6B6357' },
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
