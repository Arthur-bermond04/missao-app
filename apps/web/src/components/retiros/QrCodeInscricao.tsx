'use client';

import { QRCodeSVG } from 'qrcode.react';

export function QrCodeInscricao({ link }: { link: string }) {
  if (!link) return null;
  return (
    <div className="flex flex-col items-center gap-1 rounded-md bg-white p-2">
      <QRCodeSVG value={link} size={96} />
      <span className="text-[10px] text-text-secondary">Aponte a câmera para inscrever-se</span>
    </div>
  );
}
