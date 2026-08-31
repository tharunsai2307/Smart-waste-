import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

/**
 * Real device-camera QR scanner (no manual-entry fallback per requirements).
 * Uses html5-qrcode which wraps getUserMedia; requires HTTPS or localhost.
 */
const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose, title }) => {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(containerId.current);
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cancelled) return;
        if (!cameras.length) {
          setError('No camera found on this device.');
          setStarting(false);
          return;
        }
        const cameraId = cameras.find((c) => /back|rear|environment/i.test(c.label))?.id || cameras[0].id;
        return scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );
      })
      .then(() => setStarting(false))
      .catch((err) => {
        console.error(err);
        setError('Could not access camera. Grant camera permission and try again.');
        setStarting(false);
      });

    return () => {
      cancelled = true;
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Camera size={16} className="text-emerald-400" /> {title || 'Scan QR code'}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        {error && (
          <div className="p-3 rounded-lg text-red-300 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            {error}
          </div>
        )}
        {starting && !error && <div className="text-xs text-slate-400 text-center py-2">Starting camera…</div>}
        <div id={containerId.current} className="rounded-xl overflow-hidden bg-black" />
        <p className="text-[11px] text-slate-500 text-center">Point your camera at the QR code posted at the hub, vehicle, or facility gate.</p>
      </div>
    </div>
  );
};

export default QrScanner;
