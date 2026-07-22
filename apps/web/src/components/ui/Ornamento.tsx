// Divisor fino com ponto verde central — uso entre seções muito diferentes do dashboard/detalhe
export function Ornamento({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '1rem 0' }}>
      <div style={{ flex: 1, height: '0.5px', background: '#E5E7EB' }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#BBF7D0' }} />
      <div style={{ flex: 1, height: '0.5px', background: '#E5E7EB' }} />
    </div>
  );
}

// Borda ornamental verde — uso em cards de destaque (ex: card de plano)
export function CardOrnamental({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-xl bg-[#FFFFFF] p-4 ${className}`}
      style={{
        border: '0.5px solid #BBF7D0',
        boxShadow: '0 0 0 1px rgba(34,197,94,0.1), 0 4px 16px rgba(22,163,74,0.06)',
      }}
    >
      {/* Cantos verdes ornamentais */}
      <div className="absolute top-2 left-2 h-3 w-3 rounded-tl border-t border-l border-[#22C55E] opacity-40" />
      <div className="absolute top-2 right-2 h-3 w-3 rounded-tr border-t border-r border-[#22C55E] opacity-40" />
      <div className="absolute bottom-2 left-2 h-3 w-3 rounded-bl border-b border-l border-[#22C55E] opacity-40" />
      <div className="absolute bottom-2 right-2 h-3 w-3 rounded-br border-b border-r border-[#22C55E] opacity-40" />
      {children}
    </div>
  );
}
