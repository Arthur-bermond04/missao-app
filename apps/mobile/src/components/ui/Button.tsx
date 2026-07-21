import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';

type Variante = 'primary' | 'secondary' | 'danger' | 'success';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variante;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CONFIG: Record<Variante, { bg: string; borda: string; texto: string }> = {
  primary: { bg: colors.primary, borda: colors.primary, texto: colors.gold },
  secondary: { bg: 'transparent', borda: colors.gold, texto: colors.gold },
  danger: { bg: 'transparent', borda: colors.dangerText, texto: colors.dangerText },
  success: { bg: colors.accent, borda: colors.accent, texto: '#fff' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const cfg = CONFIG[variant];
  const inativo = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      style={[
        styles.base,
        { backgroundColor: cfg.bg, borderColor: cfg.borda },
        inativo && styles.inativo,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={cfg.texto} size="small" />
      ) : (
        <View style={styles.conteudo}>
          {Icon ? <Icon size={16} color={cfg.texto} /> : null}
          <Text style={[styles.label, { color: cfg.texto }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inativo: { opacity: 0.55 },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15, fontWeight: '500' },
});
