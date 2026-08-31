import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QrDisplay: React.FC<{ value: string; label?: string; size?: number }> = ({ value, label, size = 120 }) => (
  <div className="inline-flex flex-col items-center gap-2 p-3 rounded-xl bg-white">
    <QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#0f172a" />
    {label && <div className="text-[10px] text-slate-700 font-mono text-center max-w-[140px] break-all">{label}</div>}
  </div>
);

export default QrDisplay;
