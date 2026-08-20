import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';

interface ProgressBarProps {
  percentual: number; // 0 a 100
  cor?: string;
}

export function ProgressBar({ percentual, cor = colors.primary }: ProgressBarProps) {
  const largura = Math.min(100, Math.max(0, percentual));
  return (
    <View style={styles.trilho}>
      <View style={[styles.preenchimento, { width: `${largura}%`, backgroundColor: cor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primaryXLight,
    overflow: 'hidden',
  },
  preenchimento: { height: 8, borderRadius: 999 },
});
