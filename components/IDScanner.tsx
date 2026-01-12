
import React, { useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { processIdCredentials } from '../services/geminiService';

interface IDScannerProps {
  onExtracted: (details: { name: string; studentId: string }) => void;
  onCancel: () => void;
}

const IDScanner: React.FC<IDScannerProps> = ({ onExtracted, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert("Error accessing camera. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    setCapturedImage(canvas.toDataURL('image/jpeg'));
    
    setIsProcessing(true);
    stopCamera();
    
    const details = await processIdCredentials(base64);
    setIsProcessing(false);
    
    if (details && (details.name || details.studentId)) {
      onExtracted(details);
    } else {
      alert("System could not verify the details. Please ensure the card is clear and try again.");
      setCapturedImage(null);
      startCamera();
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Credential Sync</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 font-bold">Close</button>
        </div>
        
        <div className="relative aspect-[1.6/1] bg-black overflow-hidden flex items-center justify-center">
          {capturedImage ? (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
          ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}
          
          <div className="absolute inset-0 border-2 border-dashed border-white/50 m-8 rounded-xl pointer-events-none flex items-center justify-center">
             {!capturedImage && !isProcessing && (
               <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest">
                 Position ID Card within Frame
               </div>
             )}
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-indigo-600/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center">
              <RefreshCw className="w-10 h-10 animate-spin mb-4" />
              <p className="font-black text-xl tracking-tighter">Processing Credentials...</p>
              <p className="text-sm opacity-80 font-medium mt-1">Authenticating student profile</p>
            </div>
          )}
        </div>

        <div className="p-8 flex justify-center">
          {!capturedImage && !isProcessing && (
            <button 
              onClick={captureAndProcess}
              className="bg-indigo-600 text-white rounded-full p-6 shadow-xl shadow-indigo-100 active:scale-90 transition-transform"
            >
              <Camera size={32} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IDScanner;
