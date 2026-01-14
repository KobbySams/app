
import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Timer, RefreshCw } from 'lucide-react';

interface QRCodeGeneratorProps {
  sessionId: string;
  courseId: string;
  token: string;
  expiresAt: string;
  refreshFrequency: number;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ sessionId, courseId, token, expiresAt, refreshFrequency }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [currentToken, setCurrentToken] = useState(token);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [refreshCountdown, setRefreshCountdown] = useState(refreshFrequency);

  useEffect(() => {
    const interval = setInterval(() => {
      // Overall session expiration
      const now = new Date();
      const end = new Date(expiresAt);
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 1000 / 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }

      // Generation frequency refresh
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          setCurrentToken(Math.random().toString(36).substring(7));
          return refreshFrequency;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, refreshFrequency]);

  const qrValue = JSON.stringify({ sessionId, courseId, token: currentToken });

  const downloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `attendance-qr-${sessionId}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="flex flex-col items-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800">
      <div className="w-full flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">Session Credentials</h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest">
          <Timer size={12} />
          {timeLeft}
        </div>
      </div>

      <div className="bg-white p-4 border-4 border-indigo-50 dark:border-slate-800 rounded-3xl mb-6 shadow-inner">
        <QRCodeCanvas 
          id="qr-canvas"
          ref={qrRef}
          value={qrValue} 
          size={200}
          style={{ width: '100%', height: 'auto', maxWidth: '200px' }}
          level="H" 
          includeMargin={true} 
        />
      </div>
      
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auto-Refresh</span>
          </div>
          <span className="text-xs font-black text-gray-900 dark:text-white">{refreshCountdown}s</span>
        </div>

        <button 
          onClick={downloadQR}
          className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
        >
          <Download size={18} />
          Export Token
        </button>
      </div>
      
      <p className="mt-6 text-[10px] text-gray-400 dark:text-slate-500 text-center leading-relaxed font-medium">
        Valid until session termination. Dynamic tokens prevent credential sharing.
      </p>
    </div>
  );
};

export default QRCodeGenerator;
