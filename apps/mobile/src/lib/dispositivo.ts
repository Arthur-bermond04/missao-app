import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

const CHAVE = 'missaoapp:dispositivo-id';

// Identificador estável deste aparelho, persistido em AsyncStorage —
// reaproveitado em todo login enquanto o usuário não trocar de aparelho
// nem clicar em "Redefinir dispositivo" em Configurações (web).
export async function obterDispositivoId(): Promise<string> {
  const rotulo = [Device.modelName, Device.osName].filter(Boolean).join(' · ') || 'Dispositivo';
  try {
    let sufixo = await AsyncStorage.getItem(CHAVE);
    if (!sufixo) {
      sufixo = Math.random().toString(36).slice(2, 8);
      await AsyncStorage.setItem(CHAVE, sufixo);
    }
    return `${rotulo} · ${sufixo}`;
  } catch {
    return rotulo;
  }
}
