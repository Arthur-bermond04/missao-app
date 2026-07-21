export interface StatusIntegracoes {
  inscricaoPublica: boolean;
  push: boolean;
  whatsapp: boolean;
  email: boolean;
}

export async function buscarStatusIntegracoes(): Promise<StatusIntegracoes> {
  const res = await fetch('/api/status/integracoes');
  if (!res.ok) return { inscricaoPublica: false, push: false, whatsapp: false, email: false };
  return res.json();
}
