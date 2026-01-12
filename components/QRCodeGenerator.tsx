
import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Share2 } from 'lucide-react';

interface QRCodeGeneratorProps {
  sessionId: string;
  courseId: string;
  token: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ sessionId, courseId, token }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const qrValue = JSON.stringify({ sessionId, courseId, token });

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
    <div className="flex flex-col items-center bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
      <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 text-center">Class QR Code</h3>
      <div className="bg-white p-3 md:p-4 border-4 md:border-8 border-indigo-50 rounded-2xl relative group mb-6">
        <QRCodeCanvas 
          id="qr-canvas"
          ref={qrRef}
          value={qrValue} 
          size={220}
          style={{ width: '100%', height: 'auto', maxWidth: '220px' }}
          level="H" 
          includeMargin={true} 
        />
      </div>
      
      <div className="flex flex-col gap-3 w-full">
        <button 
          onClick={downloadQR}
          className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-[0.98]"
        >
          <Download size={18} />
          Download QR
        </button>
        
        <div className="flex gap-2">
           <span className="flex-1 inline-flex items-center justify-center px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800">
              Active
           </span>
           <span className="flex-1 inline-flex items-center justify-center px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
      </div>
      
      <p className="mt-4 text-[10px] text-gray-400 text-center max-w-xs leading-relaxed">
        Students can scan this from your screen or from a shared file.
      </p>
    </div>
  );
};

export default QRCodeGenerator;
