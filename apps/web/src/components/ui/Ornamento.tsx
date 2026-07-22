// Divisor fino — uso entre seções muito diferentes do dashboard/detalhe
export function Ornamento({ className }: { className?: string }) {
  return <div className={`my-4 h-px w-full bg-[#E2D9C8] ${className}`} style={{ height: '0.5px' }} />;
}

// Borda ornamental dourada — uso em cards de destaque (ex: card de plano, onboarding)
export function CardOrnamental({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-xl border border-[#E2D9C8] bg-[#FAFAF8] p-4 ${className}`}
      style={{ boxShadow: '0 0 0 1px rgba(201,168,76,0.15), 0 4px 16px rgba(201,168,76,0.08)' }}
    >
      {/* Cantos dourados ornamentais */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#C9A84C] opacity-60 rounded-tl" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#C9A84C] opacity-60 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#C9A84C] opacity-60 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#C9A84C] opacity-60 rounded-br" />
      {children}
    </div>
  );
}
