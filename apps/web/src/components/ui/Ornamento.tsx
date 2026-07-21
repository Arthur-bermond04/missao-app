// Divisor ornamental com cruz central — uso entre seções
export function Ornamento({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 my-4 ${className}`}>
      <div className="flex-1 h-px bg-[#E2D9C8]" />
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="7" y="2" width="2" height="12" rx="1" fill="#C9A84C" opacity=".4" />
        <rect x="2" y="7" width="12" height="2" rx="1" fill="#C9A84C" opacity=".4" />
      </svg>
      <div className="flex-1 h-px bg-[#E2D9C8]" />
    </div>
  );
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
