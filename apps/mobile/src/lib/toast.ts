// Toast global bem simples via emitter em nível de módulo.
// O <ToastHost /> (montado no App.tsx) escuta os eventos e renderiza a mensagem.

export type TipoToast = 'sucesso' | 'erro' | 'info';

export interface EventoToast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
}

type Ouvinte = (evento: EventoToast) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

export function inscreverToast(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function emitir(tipo: TipoToast, mensagem: string) {
  contador += 1;
  const evento: EventoToast = { id: contador, tipo, mensagem };
  ouvintes.forEach((o) => o(evento));
}

export function toastSucesso(mensagem: string) {
  emitir('sucesso', mensagem);
}

export function toastErro(mensagem: string) {
  emitir('erro', mensagem);
}

export function toastInfo(mensagem: string) {
  emitir('info', mensagem);
}
