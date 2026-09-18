'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { usePainelSession } from '@/lib/PainelSessionContext';
import { gerarAlertasCentral, listarAlertasVistos, type AlertaCentral } from '@/lib/alertas';

const TOPO = 5;

// Antes tinha seu próprio motor (resumoNotificacoes()), com critérios
// próprios e sem "marcar como visto" — o número no sino podia não bater com
// o que aparecia em /alertas para o mesmo problema, porque cada um calculava
// do seu jeito. Agora os dois usam gerarAlertasCentral(): o sino é só um
// recorte (top 5, por nível de urgência) do mesmo resultado, e já ganha
// "marcar como visto" de graça (persistido em usuarios.preferencias_notificacao).
export function NotificacoesBell({ comunidadeId }: { comunidadeId: string }) {
  const { usuario } = usePainelSession();
  const [alertas, setAlertas] = useState<AlertaCentral[]>([]);
  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!usuario) return;
    Promise.all([gerarAlertasCentral(comunidadeId, usuario), listarAlertasVistos(usuario.id)]).then(
      ([lista, vistosSet]) => {
        setAlertas(lista);
        setVistos(vistosSet);
      }
    );
  }, [comunidadeId, usuario]);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const naoVistos = useMemo(() => alertas.filter((a) => !vistos.has(a.id)), [alertas, vistos]);
  const total = naoVistos.length;
  const topo = naoVistos.slice(0, TOPO);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="group relative rounded-md p-2 text-sidebar-text transition-colors hover:bg-sidebar-bg-hover hover:text-sidebar-text-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
        title="Notificações"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-green px-1 text-[10px] font-bold text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-border bg-bg-card p-2 shadow-hover">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-text-secondary">Notificações</p>
          {topo.length === 0 ? (
            <p className="px-2 py-3 text-sm text-text-secondary">Tudo em dia — nenhum alerta agora.</p>
          ) : (
            <div className="mt-1 space-y-1">
              {topo.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  onClick={() => setAberto(false)}
                  className={`block rounded-md px-2 py-2 text-sm hover:bg-bg-page ${
                    a.nivel === 'urgente' ? 'text-danger' : a.nivel === 'atencao' ? 'text-warning' : 'text-text-primary'
                  }`}
                >
                  <span className="mr-1.5 rounded-full bg-bg-page px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                    {a.modulo}
                  </span>
                  {a.mensagem}
                </Link>
              ))}
              {total > TOPO && (
                <p className="px-2 pt-1 text-xs text-text-secondary">+ {total - TOPO} outro(s) alerta(s)</p>
              )}
            </div>
          )}
          <Link
            href="/alertas"
            onClick={() => setAberto(false)}
            className="mt-2 block border-t border-border px-2 py-2 text-center text-xs font-medium text-primary hover:bg-bg-page"
          >
            Ver central de alertas →
          </Link>
        </div>
      )}
    </div>
  );
}
