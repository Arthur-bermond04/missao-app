const CHAVE = 'missaoapp:dispositivo-id';

function rotularNavegador(userAgent: string): string {
  const navegador = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Navegador';
  const so = /Windows/.test(userAgent)
    ? 'Windows'
    : /Mac OS/.test(userAgent)
      ? 'macOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad/.test(userAgent)
          ? 'iOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return so ? `${navegador} · ${so}` : navegador;
}

// Identificador estável deste navegador/dispositivo, persistido em
// localStorage — reaproveitado em todo login enquanto o usuário não limpar
// os dados do navegador nem clicar em "Redefinir dispositivo".
export function obterDispositivoId(): string {
  if (typeof window === 'undefined') return 'desconhecido';
  const rotulo = rotularNavegador(window.navigator.userAgent);
  try {
    let sufixo = window.localStorage.getItem(CHAVE);
    if (!sufixo) {
      sufixo = Math.random().toString(36).slice(2, 8);
      window.localStorage.setItem(CHAVE, sufixo);
    }
    return `${rotulo} · ${sufixo}`;
  } catch {
    return rotulo;
  }
}
