import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface MetricCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function MetricCard({ icon: Icon, iconColor, iconBg, label, value, subtitle, style }: MetricCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconeCirculo, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valor} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!subtitle && (
        <Text style={styles.subtitulo} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconeCirculo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  valor: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 2 },
  subtitulo: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
