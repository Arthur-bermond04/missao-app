import * as Haptics from 'expo-haptics';

// Feedback háptico de sucesso/erro. Envolto em try/catch porque haptics
// não existe em todos os dispositivos (ex.: alguns Android/emuladores).
export function hapticoSucesso() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticoErro() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
