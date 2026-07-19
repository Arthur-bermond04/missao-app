import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { inscreverToast, type EventoToast, type TipoToast } from '../../lib/toast';

const CONFIG: Record<TipoToast, { bg: string; texto: string }> = {
  sucesso: { bg: colors.accentLight, texto: colors.accent },
  erro: { bg: colors.dangerLight, texto: colors.dangerText },
  info: { bg: colors.primaryLight, texto: colors.primary },
};

export function ToastHost() {
  const [evento, setEvento] = useState<EventoToast | null>(null);
  const opacidade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return inscreverToast((novo) => setEvento(novo));
  }, []);

  useEffect(() => {
    if (!evento) return;
    Animated.timing(opacidade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacidade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        setEvento(null)
      );
    }, 2600);
    return () => clearTimeout(timer);
  }, [evento, opacidade]);

  if (!evento) return null;
  const cfg = CONFIG[evento.tipo];

  return (
    <Animated.View style={[styles.container, { backgroundColor: cfg.bg, opacity: opacidade }]}>
      <Text style={[styles.texto, { color: cfg.texto }]}>{evento.mensagem}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  texto: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
