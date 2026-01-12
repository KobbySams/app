
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Camera, Image as ImageIcon, Upload } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (err: any) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const [mode, setMode] = useState<'idle' | 'camera' | 'gallery'>('idle');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'camera') {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScan(decodedText);
          setMode('idle');
        },
        (error) => {
          if (onError) onError(error);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [mode, onScan, onError]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      onScan(decodedText);
      setMode('idle');
    } catch (err) {
      if (onError) onError("Could not find QR code in image");
      alert("No QR code detected in this image. Please try another one.");
    } finally {
      html5QrCode.clear();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Hidden div for file scanning processing */}
      <div id="qr-reader-hidden" className="hidden"></div>
      
      {mode === 'idle' ? (
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => setMode('camera')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
          >
            <Camera className="h-6 w-6" />
            Scan with Camera
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <ImageIcon className="h-6 w-6" />
            Upload from Gallery
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload}
          />
        </div>
      ) : mode === 'camera' ? (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-200">
          <div id="qr-reader" className="overflow-hidden rounded-lg"></div>
          <button
            onClick={() => setMode('idle')}
            className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default QRScanner;
