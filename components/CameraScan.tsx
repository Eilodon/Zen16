
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, ScanEye } from 'lucide-react';
import { analyzeEnvironment } from '../services/geminiService';
import { CulturalMode } from '../types';
import { useUIStore } from '../store/zenStore';
import { usePermissions } from '../hooks/usePermissions';

interface Props {
  onModeChange: (mode: CulturalMode, items: string[]) => void;
  currentMode: CulturalMode;
}

export const CameraScan: React.FC<Props> = ({ onModeChange, currentMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { setSnackbar } = useUIStore();
  const { requestCamera } = usePermissions();

  const startCamera = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Use centralized permission logic
    const granted = await requestCamera();
    
    if (granted) {
      try {
        // Request the stream knowing permission is likely granted
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = s;
        setIsOpen(true);
      } catch (err: any) {
         console.error("Camera start error", err);
         setSnackbar({ text: "Lỗi camera không mong muốn.", kind: "error" });
      }
    } else {
       setSnackbar({ text: "Cần quyền Camera để sử dụng tính năng này.", kind: "warn" });
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }
    setIsOpen(false);
  };

  // Bind video element to stream when open
  useEffect(() => {
    if (isOpen && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.warn);
    }
  }, [isOpen]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;
    
    setIsScanning(true);
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    const MAX_DIMENSION = 800;
    let w = video.videoWidth;
    let h = video.videoHeight;
    
    if (w > h) {
       if (w > MAX_DIMENSION) {
          h = Math.round(h * (MAX_DIMENSION / w));
          w = MAX_DIMENSION;
       }
    } else {
       if (h > MAX_DIMENSION) {
          w = Math.round(w * (MAX_DIMENSION / h));
          h = MAX_DIMENSION;
       }
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        
        try {
            const result = await analyzeEnvironment("", base64);
            onModeChange(result.mode, result.detected_items);
            closeCamera();
        } catch (e: any) {
            console.error(e);
            if (e.message.includes("API_KEY_MISSING")) {
                setSnackbar({ text: "Cần API Key để phân tích", kind: "warn" });
            } else {
                setSnackbar({ text: "Lỗi phân tích hình ảnh", kind: "error" });
            }
        } finally {
            setIsScanning(false);
        }
    } else {
        setIsScanning(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-2">
        <button 
          type="button"
          onClick={(e) => !isOpen && startCamera(e)}
          className={`p-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
            currentMode === 'VN' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white/80 backdrop-blur text-stone-700 border-stone-200'
          } border`}
          aria-label="Scan Environment"
          title="Quét không gian để chọn Mode"
        >
          <Camera size={20} />
        </button>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full mt-1.5 shadow-sm transition-colors ${
           currentMode === 'VN' ? 'bg-amber-500 text-white' : 'bg-stone-500 text-white'
        }`}>
          {currentMode}
        </span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-stone-900 rounded-2xl overflow-hidden border border-stone-700 shadow-2xl">
            {!isScanning ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-64 object-cover" 
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-stone-800">
                <ScanEye className="animate-pulse text-amber-500 w-16 h-16" />
              </div>
            )}
            
            <div className="p-4 flex flex-col gap-3">
              <p className="text-stone-300 text-sm text-center">
                Ảnh được gửi ẩn danh để AI phân tích bối cảnh và bị xóa ngay lập tức.
              </p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={closeCamera}
                  disabled={isScanning}
                  className="px-4 py-2 rounded-full bg-stone-700 text-white flex items-center gap-2 hover:bg-stone-600 transition-colors"
                >
                  <X size={16} /> Hủy
                </button>
                <button 
                  onClick={captureAndAnalyze}
                  disabled={isScanning}
                  className="px-6 py-2 rounded-full bg-orange-600 text-white flex items-center gap-2 font-bold hover:bg-orange-700 transition-colors shadow-lg"
                >
                  {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Quét
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
